"""Load UCSC pipeline snapshots into Postgres.

Transactional per source: each load_* replaces that source's rows for the
university inside one transaction, so a crash mid-load can't serve a half
state, and pointing at an older snapshot dir IS the rollback mechanism.
Every applied load is recorded in pipeline_runs (provenance + loaded_at).

Run:  python -m app.loaders.ucsc [--courses PATH] [--offerings PATH]
                                 [--soe PATH] [--programs PATH]
(paths default to the newest finalized snapshot of each source; a source
with no snapshot is skipped with a warning.)
"""

from __future__ import annotations

import argparse
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
    ensure_university(db, manifest.get("catalog_year"))

    db.execute(delete(CoursePrereqEdge).where(
        CoursePrereqEdge.course_id.in_(
            select(Course.id).where(Course.university_id == UNIVERSITY_ID)
        )
    ))
    db.execute(delete(CourseAvailability).where(
        CourseAvailability.course_id.in_(
            select(Course.id).where(Course.university_id == UNIVERSITY_ID)
        )
    ))
    db.execute(delete(Course).where(Course.university_id == UNIVERSITY_ID))

    id_by_code: dict[str, int] = {}
    for c in courses:
        row = Course(
            university_id=UNIVERSITY_ID,
            code=c["code"],
            subject=c["subject"],
            number=c["number"],
            display_code=c["display_code"],
            title=c["title"],
            description=c.get("description", ""),
            credits=c.get("credits", ""),
            division=c.get("division", ""),
            ge_codes=c.get("ge_codes") or [],
            quarters_offered_text=c.get("quarters_offered_text"),
            catalog_instructor=c.get("catalog_instructor"),
            cross_listed=c.get("cross_listed") or [],
            formerly=c.get("formerly"),
            repeatable=bool(c.get("repeatable")),
            url=c.get("url"),
            raw_requirements=c.get("raw_requirements"),
            prereq_groups=c.get("prereq_groups"),
            is_active=True,
        )
        db.add(row)
        db.flush()
        id_by_code[row.code] = row.id

    for c in courses:
        groups = c.get("prereq_groups") or []
        prereq_codes = {code for group in groups for code in group}
        for code in sorted(prereq_codes):
            db.add(
                CoursePrereqEdge(
                    course_id=id_by_code[c["code"]],
                    prereq_code=code,
                    prereq_course_id=id_by_code.get(code),
                )
            )
    _record_run(db, "catalog_courses_structured", snapshot_dir, manifest)
    print(f"  courses: {len(courses)} loaded")


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
    print(f"  offerings: {total} loaded")


def load_programs(db: Session, snapshot_dir: Path) -> None:
    manifest = snapshots.manifest(snapshot_dir)
    programs = snapshots.read_json(snapshot_dir, "programs.json")
    db.execute(delete(Program).where(Program.university_id == UNIVERSITY_ID))
    loaded = 0
    for p in programs:
        if p.get("requirements") is None:
            continue  # quarantined program: keep it out of the app entirely
        db.add(
            Program(
                university_id=UNIVERSITY_ID,
                name=p["name"],
                degree=p["degree"],
                kind=p["kind"],
                division=p.get("division"),
                department=p.get("department"),
                slug=p["slug"],
                url=p["url"],
                catalog_year=manifest.get("catalog_year"),
                requirements=p["requirements"],
                verification="unverified",
            )
        )
        loaded += 1
    _record_run(db, "major_requirements_structured", snapshot_dir, manifest)
    print(f"  programs: {loaded} loaded ({len(programs) - loaded} quarantined skipped)")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--courses", type=Path)
    ap.add_argument("--offerings", type=Path)
    ap.add_argument("--soe", type=Path)
    ap.add_argument("--programs", type=Path)
    ap.add_argument(
        "--only", choices=["courses", "offerings", "programs", "availability"],
        help="load just one source (default: everything with a snapshot)",
    )
    args = ap.parse_args()

    courses_dir = args.courses or snapshots.latest(UNIVERSITY_ID, "catalog_courses_structured")
    pisa_dirs = [args.offerings] if args.offerings else snapshots.all_finalized(
        UNIVERSITY_ID, "pisa_offerings"
    )
    soe_dir = args.soe or snapshots.latest(UNIVERSITY_ID, "soe_schedule")
    programs_dir = args.programs or snapshots.latest(
        UNIVERSITY_ID, "major_requirements_structured"
    )

    with SessionLocal() as db:
        with db.begin():
            if args.only in (None, "courses"):
                if courses_dir:
                    load_courses(db, courses_dir)
                else:
                    print("WARNING: no structured courses snapshot; skipping", file=sys.stderr)
            if args.only in (None, "offerings"):
                if pisa_dirs or soe_dir:
                    load_offerings(db, pisa_dirs, soe_dir)
                else:
                    print("WARNING: no offerings snapshots; skipping", file=sys.stderr)
            if args.only in (None, "programs"):
                if programs_dir:
                    load_programs(db, programs_dir)
                else:
                    print("WARNING: no programs snapshot; skipping", file=sys.stderr)
            if args.only in (None, "availability"):
                compute_availability(db, UNIVERSITY_ID)
    print("done")


if __name__ == "__main__":
    main()
