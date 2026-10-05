"""Load UCSC data into Postgres — everything from the committed dataset.

``data-committed/ucsc/`` is canonical; the database is a disposable
projection of it. Rollback = ``git checkout <rev> -- data-committed/`` + reload.

  courses/<SUBJ>.json             catalog (current edition), id-preserving upsert
  offerings/<term>.jsonl          pisa history, one section per line
  soe/<academic-year>.jsonl       Baskin planned schedule (is_planned=True)
  editions/<ed>/programs.json     program index per catalog edition
  editions/<ed>/sources/<slug>.md committed official page text
  programs/<slug>.json            legacy generic-JSON harness (2026-27 only)

Everything runs in one transaction per invocation; every load is recorded
in pipeline_runs.

Run:  python -m app.loaders.ucsc [--only courses|offerings|programs|availability]
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
        # Committed data stores catalog-site-relative urls; serve absolute.
        if row.url and row.url.startswith("/"):
            row.url = "https://catalog.ucsc.edu" + row.url
        row.ge_codes = c.get("ge_codes") or []
        row.cross_listed = c.get("cross_listed") or []
        row.repeatable = bool(c.get("repeatable"))
        row.prereq_groups = c.get("prereq_groups")
        row.concurrent_ok = c.get("concurrent_ok") or []
        row.coreqs = c.get("coreqs") or []
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


def _read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def load_offerings(db: Session) -> None:
    root = snapshots.COMMITTED_ROOT / UNIVERSITY_ID
    db.execute(delete(CourseOffering).where(CourseOffering.university_id == UNIVERSITY_ID))
    id_by_code = {
        c.code: c.id
        for c in db.scalars(select(Course).where(Course.university_id == UNIVERSITY_ID))
    }
    term_files = sorted((root / "offerings").glob("*.jsonl"))
    soe_files = sorted((root / "soe").glob("*.jsonl"))
    if not term_files and not soe_files:
        print("WARNING: no committed offerings; skipping", file=sys.stderr)
        return
    term_ids = ensure_terms(db, {f.stem for f in term_files})

    pisa_rows = 0
    for f in term_files:
        for o in _read_jsonl(f):
            db.add(
                CourseOffering(
                    university_id=UNIVERSITY_ID,
                    term_id=term_ids[f.stem],
                    course_code=o["course_code"],
                    course_id=id_by_code.get(o["course_code"]),
                    section=o.get("section"),
                    class_number=o.get("class_number"),
                    title=o.get("title"),
                    instructors=[{"name": n} for n in o.get("instructors") or []],
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
            pisa_rows += 1

    soe_rows = 0
    for f in soe_files:
        planned = _read_jsonl(f)
        term_ids.update(ensure_terms(db, {p["term"]["term_code"] for p in planned}))
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
            soe_rows += 1
    _record_run(db, "committed_offerings", root / "offerings", {
        "terms": [f.stem for f in term_files], "pisa_rows": pisa_rows,
        "soe_years": [f.stem for f in soe_files], "soe_rows": soe_rows,
    })
    db.flush()  # session has autoflush=False; downstream availability SELECTs
    print(f"  offerings: {pisa_rows} pisa rows over {len(term_files)} terms, {soe_rows} planned")


# The legacy generic-JSON harness predates two CMS slug fixes.
LEGACY_SLUG_ALIASES = {"physics-bs": "copy-of-physics-bs"}
LEGACY_EDITION = "2026-27"


def load_programs_committed(db: Session) -> None:
    """Programs for every committed edition — (slug, edition)-keyed upsert.

    Preserved row ids keep saved plan program_ids valid across reloads. The
    legacy generic-JSON harness (programs/<slug>.json) is attached to its
    edition where present; its ``verification`` block maps to the DB status.
    """
    root = snapshots.COMMITTED_ROOT / UNIVERSITY_ID
    edition_dirs = sorted(d for d in (root / "editions").glob("*") if (d / "programs.json").exists())
    if not edition_dirs:
        print("WARNING: no committed editions; skipping programs", file=sys.stderr)
        return
    existing = {
        (p.slug, p.catalog_year): p
        for p in db.scalars(select(Program).where(Program.university_id == UNIVERSITY_ID))
    }
    seen = set()
    inserted = updated = 0
    for ed_dir in edition_dirs:
        edition = ed_dir.name
        for meta in json.loads((ed_dir / "programs.json").read_text()):
            key = (meta["slug"], edition)
            seen.add(key)
            row = existing.get(key)
            if row is None:
                row = Program(university_id=UNIVERSITY_ID, slug=meta["slug"], catalog_year=edition)
                db.add(row)
                inserted += 1
            else:
                updated += 1
            row.name = meta["name"]
            row.degree = meta["degree"]
            row.kind = meta["kind"]
            row.division = meta.get("division")
            row.department = meta.get("department")
            row.url = meta["url"]
            row.archive_url = meta.get("archive_url")
            row.source_sha256 = meta.get("source_sha256")
            src = ed_dir / "sources" / f"{meta['slug']}.md"
            row.source_md = src.read_text() if src.exists() else None
            _attach_legacy(row, root / "programs", edition)
    removed = [k for k in existing if k not in seen]
    for k in removed:
        db.delete(existing[k])
    _record_run(
        db, "committed_programs", root / "editions",
        {"editions": [d.name for d in edition_dirs], "inserted": inserted,
         "updated": updated, "removed": len(removed)},
    )
    print(f"  programs: {updated} updated, {inserted} inserted, {len(removed)} removed "
          f"across editions {[d.name for d in edition_dirs]}")


def _attach_legacy(row: Program, legacy_dir: Path, edition: str) -> None:
    f = legacy_dir / f"{LEGACY_SLUG_ALIASES.get(row.slug, row.slug)}.json"
    if edition != LEGACY_EDITION or not f.exists():
        row.requirements = None
        row.verification = "unverified"
        row.verified_at = row.verification_notes = None
        return
    d = json.loads(f.read_text())
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


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--only", choices=["courses", "offerings", "programs", "availability"],
        help="load just one source (default: everything)",
    )
    args = ap.parse_args()
    with SessionLocal() as db:
        with db.begin():
            if args.only in (None, "courses"):
                load_courses_committed(db)
            if args.only in (None, "offerings"):
                load_offerings(db)
            if args.only in (None, "programs"):
                load_programs_committed(db)
            if args.only in (None, "availability"):
                compute_availability(db, UNIVERSITY_ID)
    print("done")


if __name__ == "__main__":
    main()
