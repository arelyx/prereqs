"""Load UCSC data into Postgres.

Canonical sources:
- Courses + program requirements: the git-committed dataset
  (data-committed/ucsc/, see pipelines/ucsc/export_committed.py) — loaded
  with id-preserving upserts so offerings/plan references survive reloads.
  Rollback = `git checkout <rev> -- data-committed/` + reload.
- Offerings: data/ snapshots (deterministic scrape, per-term union).

Everything runs in one transaction per invocation; every applied load is
recorded in pipeline_runs (provenance + loaded_at).

Run:  python -m app.loaders.ucsc [--only courses|offerings|programs|availability]
      (--courses/--offerings/--soe accept explicit snapshot dirs for
      emergency snapshot-level rollback of non-committed sources)
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import (
    Course,
    CourseAvailability,
    CourseOffering,
    CoursePrereqEdge,
    PipelineRun,
    Program,
    Term,
    University,
)
from . import snapshots, terms
from .availability import compute_availability

UNIVERSITY_ID = "ucsc"


def ensure_university(db: Session, catalog_year: str | None) -> None:
    uni = db.get(University, UNIVERSITY_ID)
    if uni is None:
        uni = University(
            id=UNIVERSITY_ID,
            name="UC Santa Cruz",
            term_system="quarter",
            catalog_year=catalog_year,
        )
        db.add(uni)
    elif catalog_year:
        uni.catalog_year = catalog_year
    db.flush()


def ensure_terms(db: Session, term_codes: set[str]) -> dict[str, int]:
    existing = {
        t.code: t.id
        for t in db.scalars(select(Term).where(Term.university_id == UNIVERSITY_ID))
    }
    for code in sorted(term_codes - existing.keys()):
        year, season = terms.parse_term_code(code)
        t = Term(
            university_id=UNIVERSITY_ID,
            code=code,
            year=year,
            season=season,
            sort_key=int(code),
        )
        db.add(t)
        db.flush()
        existing[code] = t.id
    return existing


def _record_run(db: Session, source: str, snapshot_dir: Path, manifest: dict) -> None:
    db.add(
        PipelineRun(
            university_id=UNIVERSITY_ID,
            source=source,
            snapshot_path=str(snapshot_dir),
            status="succeeded",
            started_at=None,
            finished_at=None,
            manifest={k: v for k, v in manifest.items() if k != "failures"} | {
                "failure_count": len(manifest.get("failures", []))
            },
            loaded_at=datetime.now(timezone.utc),
        )
    )


def load_courses(db: Session, snapshot_dir: Path) -> None:
    manifest = snapshots.manifest(snapshot_dir)
    courses = snapshots.read_json(snapshot_dir, "courses.json")
    catalog_year = manifest.get("catalog_year")
    ensure_university(db, catalog_year)
    _upsert_courses(db, courses)
    _record_run(db, "catalog_courses_structured", snapshot_dir, manifest)


def load_courses_committed(db: Session) -> None:
    """Load the course catalog from the git-committed dataset (canonical)."""
    root = snapshots.COMMITTED_ROOT / UNIVERSITY_ID / "courses"
    files = sorted(root.glob("*.json"))
    if not files:
        print("WARNING: no committed course files; skipping", file=sys.stderr)
        return
    courses: list[dict] = []
    year = None
    for f in files:
        d = json.loads(f.read_text())
        year = year or d.get("catalog_year")
        courses.extend(d["courses"])
    ensure_university(db, year)
    _upsert_courses(db, courses)
    _record_run(
        db, "committed_courses", root,
        {"catalog_year": year, "files": len(files), "courses": len(courses)},
    )


def _upsert_courses(db: Session, courses: list[dict]) -> None:
    """Stable, id-preserving sync of the courses table.

    Updates in place by code, inserts new codes, deletes codes absent from
    the dataset. Preserved ids keep offerings/availability/plan references
    coherent across reloads. Prereq edges are derived data — rebuilt whole.
    """
    existing = {
        c.code: c
        for c in db.scalars(select(Course).where(Course.university_id == UNIVERSITY_ID))
    }
    incoming_codes = {c["code"] for c in courses}
    fields = (
        "subject", "number", "display_code", "title", "description", "credits",
        "division", "quarters_offered_text", "catalog_instructor", "formerly",
        "url", "raw_requirements",
    )
    inserted = updated = 0
    id_by_code: dict[str, int] = {}
    for c in courses:
        row = existing.get(c["code"])
        if row is None:
            row = Course(university_id=UNIVERSITY_ID, code=c["code"])
            db.add(row)
            inserted += 1
        else:
            updated += 1
        for f in fields:
            setattr(row, f, c.get(f) if c.get(f) is not None else getattr(row, f, None))
        row.ge_codes = c.get("ge_codes") or []
        row.cross_listed = c.get("cross_listed") or []
        row.repeatable = bool(c.get("repeatable"))
        row.prereq_groups = c.get("prereq_groups")
        row.is_active = True
        db.flush()
        id_by_code[row.code] = row.id

    removed = [code for code in existing if code not in incoming_codes]
    for code in removed:
        db.delete(existing[code])
    db.flush()

    db.execute(delete(CoursePrereqEdge).where(
        CoursePrereqEdge.course_id.in_(
            select(Course.id).where(Course.university_id == UNIVERSITY_ID)
        )
    ))
    for c in courses:
        groups = c.get("prereq_groups") or []
        for code in sorted({x for g in groups for x in g}):
            db.add(
                CoursePrereqEdge(
                    course_id=id_by_code[c["code"]],
                    prereq_code=code,
                    prereq_course_id=id_by_code.get(code),
                )
            )
    print(f"  courses: {updated} updated, {inserted} inserted, {len(removed)} removed")


def _union_pisa_offerings(pisa_dirs: list[Path]) -> list[dict]:
    """Union offerings across snapshots; for each term the NEWEST snapshot
    containing it wins whole. Lets backfills land in chunks (the upstream
    server 504s under long runs) and future single-term refreshes supersede
    older data without a monolithic re-scrape."""
    by_term: dict[str, list[dict]] = {}
    for d in sorted(pisa_dirs):  # oldest -> newest; newest overwrites per term
        rows = snapshots.read_json(d, "offerings.json")
        terms_here: dict[str, list[dict]] = {}
        for o in rows:
            terms_here.setdefault(o["term_code"], []).append(o)
        by_term.update(terms_here)
    return [o for rows in by_term.values() for o in rows]


def load_offerings(db: Session, pisa_dirs: list[Path], soe_dir: Path | None) -> None:
    db.execute(delete(CourseOffering).where(CourseOffering.university_id == UNIVERSITY_ID))
    id_by_code = {
        c.code: c.id
        for c in db.scalars(select(Course).where(Course.university_id == UNIVERSITY_ID))
    }

    total = 0
    if pisa_dirs:
        offerings = _union_pisa_offerings(pisa_dirs)
        term_ids = ensure_terms(db, {o["term_code"] for o in offerings})
        for o in offerings:
            db.add(
                CourseOffering(
                    university_id=UNIVERSITY_ID,
                    term_id=term_ids[o["term_code"]],
                    course_code=o["course_code"],
                    course_id=id_by_code.get(o["course_code"]),
                    section=o.get("section"),
                    class_number=o.get("class_number"),
                    title=o.get("title"),
                    instructors=o.get("instructors") or [],
                    days_times=o.get("days_times"),
                    location=o.get("location"),
                    modality=o.get("modality"),
                    enrolled=o.get("enrolled"),
                    capacity=o.get("capacity"),
                    status=o.get("status"),
                    source="pisa",
                    is_planned=False,
                )
            )
        total += len(offerings)
        for d in pisa_dirs:
            _record_run(db, "pisa_offerings", d, snapshots.manifest(d))

    if soe_dir is not None:
        planned = snapshots.read_json(soe_dir, "planned.json")
        term_ids = ensure_terms(db, {p["term"]["term_code"] for p in planned})
        for p in planned:
            db.add(
                CourseOffering(
                    university_id=UNIVERSITY_ID,
                    term_id=term_ids[p["term"]["term_code"]],
                    course_code=p["course_code"],
                    course_id=id_by_code.get(p["course_code"]),
                    section=p.get("section"),
                    class_number=None,
                    title=p.get("title"),
                    instructors=p.get("instructors") or [],
                    days_times=None,
                    location=None,
                    modality=p.get("modality_note"),
                    enrolled=None,
                    capacity=None,
                    status=None,
                    source="soe",
                    is_planned=True,
                )
            )
        total += len(planned)
        _record_run(db, "soe_schedule", soe_dir, snapshots.manifest(soe_dir))
    db.flush()  # session has autoflush=False; downstream availability SELECTs
    print(f"  offerings: {total} loaded")


def load_programs_committed(db: Session) -> None:
    """Load programs from the git-committed dataset — slug-keyed upsert.

    Preserved row ids keep saved plan program_ids valid across reloads
    (the delete-and-reinsert loader silently invalidated selections).
    Verification comes from each file's `verification` block; the file
    status 'frontier-verified' maps to DB 'verified'.
    """
    root = snapshots.COMMITTED_ROOT / UNIVERSITY_ID / "programs"
    files = sorted(root.glob("*.json"))
    if not files:
        print("WARNING: no committed program files; skipping", file=sys.stderr)
        return
    existing = {
        p.slug: p
        for p in db.scalars(select(Program).where(Program.university_id == UNIVERSITY_ID))
    }
    seen = set()
    inserted = updated = 0
    for f in files:
        d = json.loads(f.read_text())
        slug = d["slug"]
        seen.add(slug)
        row = existing.get(slug)
        if row is None:
            row = Program(university_id=UNIVERSITY_ID, slug=slug)
            db.add(row)
            inserted += 1
        else:
            updated += 1
        row.name = d["name"]
        row.degree = d["degree"]
        row.kind = d["kind"]
        row.division = d.get("division")
        row.department = d.get("department")
        row.url = d["url"]
        row.catalog_year = d.get("catalog_year")
        row.requirements = d["requirements"]
        v = d.get("verification") or {}
        if v.get("status") == "frontier-verified":
            row.verification = "verified"
            row.verified_at = (
                datetime.fromisoformat(v["date"]).replace(tzinfo=timezone.utc)
                if v.get("date") else None
            )
            row.verification_notes = v.get("notes")
        else:
            row.verification = "unverified"
            row.verified_at = None
            row.verification_notes = None
    removed = [s for s in existing if s not in seen]
    for s in removed:
        db.delete(existing[s])
    _record_run(
        db, "committed_programs", root,
        {"files": len(files), "inserted": inserted, "updated": updated, "removed": len(removed)},
    )
    print(f"  programs: {updated} updated, {inserted} inserted, {len(removed)} removed")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--courses", type=Path)
    ap.add_argument("--offerings", type=Path)
    ap.add_argument("--soe", type=Path)
    ap.add_argument(
        "--only", choices=["courses", "offerings", "programs", "availability"],
        help="load just one source (default: everything with a snapshot)",
    )
    args = ap.parse_args()

    pisa_dirs = [args.offerings] if args.offerings else snapshots.all_finalized(
        UNIVERSITY_ID, "pisa_offerings"
    )
    soe_dir = args.soe or snapshots.latest(UNIVERSITY_ID, "soe_schedule")

    with SessionLocal() as db:
        with db.begin():
            if args.only in (None, "courses"):
                if args.courses:
                    load_courses(db, args.courses)  # explicit snapshot (rollback)
                else:
                    load_courses_committed(db)
            if args.only in (None, "offerings"):
                if pisa_dirs or soe_dir:
                    load_offerings(db, pisa_dirs, soe_dir)
                else:
                    print("WARNING: no offerings snapshots; skipping", file=sys.stderr)
            if args.only in (None, "programs"):
                load_programs_committed(db)
            if args.only in (None, "availability"):
                compute_availability(db, UNIVERSITY_ID)
    print("done")


if __name__ == "__main__":
    main()
