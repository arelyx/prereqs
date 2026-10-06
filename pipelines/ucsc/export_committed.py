"""Export the structured course catalog into the committed dataset (hot path).

  data-committed/ucsc/courses/<SUBJECT>.json   one subject per file, sorted

Reads the newest ``catalog_courses_structured`` snapshot (deterministic
prereq parser + warm-path overrides), rewrites a subject file only when its
content changed, and records the ``catalog_courses`` ledger block — including
any requirement text the parser could not decide and no override covers
(``prereq_unresolved``), which ``refresh status`` turns into a WARM task.

Usage:
  python -m ucsc.export_committed
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from common.snapshot import latest, load_manifest

from . import editions, ledger

COMMITTED_ROOT = ledger.COMMITTED_ROOT

_dump = ledger.dump


def _read(path: Path) -> dict | None:
    if not path.exists():
        return None
    return json.loads(path.read_text())


def _content_equal(a: dict, b: dict) -> bool:
    """Compare export payloads ignoring bookkeeping blocks."""
    def strip(d: dict) -> dict:
        return {k: v for k, v in d.items() if k not in ("verification", "origin", "provenance")}
    return strip(a) == strip(b)


def export_courses() -> int:
    snap = latest("ucsc", "catalog_courses_structured")
    if snap is None:
        sys.exit("no catalog_courses_structured snapshot to export")
    manifest = load_manifest(snap)
    courses = json.loads((snap / "courses.json").read_text())
    out_dir = COMMITTED_ROOT / "courses"
    by_subject: dict[str, list[dict]] = {}
    for c in courses:
        by_subject.setdefault(c["subject"], []).append(c)

    written = 0
    for subject, rows in sorted(by_subject.items()):
        path = out_dir / f"{subject}.json"
        record = {
            "subject": subject,
            "catalog_year": manifest.get("catalog_year"),
            "origin": "deterministic-pipeline",
            "provenance": {
                "parser_version": manifest.get("parser_version"),
                "overrides_sha1": manifest.get("overrides_sha1"),
            },
            "courses": sorted(rows, key=lambda r: r["code"]),
        }
        existing = _read(path)
        if existing is not None and _content_equal(existing, record):
            continue
        _dump(path, record)
        written += 1
    stale = [f.stem for f in out_dir.glob("*.json") if f.stem not in by_subject]
    for subj in stale:
        (out_dir / f"{subj}.json").unlink()
    year = manifest.get("catalog_year") or ""
    counts = manifest.get("counts", {})
    ledger.update("catalog_courses", {
        "edition": editions.short_id(int(year[:4])) if year[:4].isdigit() else None,
        "fetched_at": ledger.snapshot_time(Path(manifest["source_snapshot"])),
        "courses": len(courses),
        "subjects": len(by_subject),
        "parser_version": manifest.get("parser_version"),
        "prereq_counts": counts,
        "prereq_unresolved": sorted(manifest.get("unresolved") or []),
        "stale_overrides": sorted(o["code"] for o in manifest.get("stale_overrides") or []),
    })
    print(f"courses: {written} subject files written, {len(stale)} subjects removed")
    return written


def write_index() -> None:
    editions_ = {
        d.name: len(json.loads((d / "programs.json").read_text()))
        for d in sorted((COMMITTED_ROOT / "editions").glob("*")) if (d / "programs.json").exists()
    }
    subjects = sorted((COMMITTED_ROOT / "courses").glob("*.json"))
    n_courses = 0
    year = None
    for f in subjects:
        d = json.loads(f.read_text())
        n_courses += len(d["courses"])
        year = year or d.get("catalog_year")
    _dump(
        COMMITTED_ROOT / "index.json",
        {
            "university": "ucsc",
            "catalog_year": year,
            "programs_by_edition": editions_,
            "subjects": len(subjects),
            "courses": n_courses,
        },
    )
    print(f"index: programs {editions_}, {len(subjects)} subjects, {n_courses} courses")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--courses", action="store_true", help="(default; kept for old runbooks)")
    ap.parse_args()
    export_courses()
    write_index()


if __name__ == "__main__":
    main()
