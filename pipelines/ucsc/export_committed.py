"""Export the structured course catalog into the committed dataset (hot path).

  data-committed/ucsc/courses/<SUBJECT>.json   one subject per file, sorted

Reads the newest ``catalog_courses_structured`` snapshot (deterministic
prereq parser + warm-path overrides), rewrites a subject file only when its
content changed, and records the ``catalog_courses`` ledger block — including
any requirement text the parser could not decide and no override covers
(``prereq_unresolved``), which ``refresh status`` turns into a WARM task.

``--legacy-programs`` re-exports the frozen generic-JSON program harness
(approach A) from a ``major_requirements_structured`` snapshot; it is not
part of the refresh. Files with ``origin: hand-edited`` are never
overwritten without ``--force``.

Usage:
  python -m ucsc.export_committed [--courses] [--legacy-programs [--force]]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from common.snapshot import latest, load_manifest

from . import editions, ledger

COMMITTED_ROOT = ledger.COMMITTED_ROOT

PROGRAM_META_KEYS = (
    "slug", "name", "degree", "kind", "division", "department", "url",
)


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


def export_programs(force: bool = False) -> tuple[int, int]:
    snap = latest("ucsc", "major_requirements_structured")
    if snap is None:
        sys.exit("no major_requirements_structured snapshot to export")
    manifest = load_manifest(snap)
    programs = json.loads((snap / "programs.json").read_text())
    out_dir = COMMITTED_ROOT / "programs"
    written = skipped = 0
    exported_slugs = set()

    for p in programs:
        if p.get("requirements") is None:
            continue  # quarantined: never export
        slug = p["slug"]
        exported_slugs.add(slug)
        path = out_dir / f"{slug}.json"
        record = {k: p.get(k) for k in PROGRAM_META_KEYS}
        record["catalog_year"] = manifest.get("catalog_year") or p.get("catalog_year")
        record["requirements"] = p["requirements"]
        record["origin"] = "local-llm-pipeline"
        record["provenance"] = {
            "snapshot": snap.name,
            "model": manifest.get("model"),
            "prompt_version": manifest.get("prompt_version"),
        }

        existing = _read(path)
        if existing is not None:
            if existing.get("origin") == "hand-edited" and not force:
                print(f"  SKIP (hand-edited): {slug}", file=sys.stderr)
                skipped += 1
                continue
            if _content_equal(existing, record):
                # No content change: keep the file byte-identical (including
                # its verification block and provenance).
                continue
            prior = existing.get("verification", {})
            if prior.get("status") == "frontier-verified":
                print(f"  verification reset (content changed): {slug}", file=sys.stderr)
        record["verification"] = {"status": "unverified"}
        _dump(path, record)
        written += 1

    stale = [f for f in out_dir.glob("*.json") if f.stem not in exported_slugs]
    for f in stale:
        print(f"  STALE (not in latest run, left in place): {f.stem}", file=sys.stderr)
    print(f"programs: {written} written, {skipped} hand-edit skips, {len(stale)} stale")
    return written, skipped


def export_courses(force: bool = False) -> tuple[int, int]:
    snap = latest("ucsc", "catalog_courses_structured")
    if snap is None:
        sys.exit("no catalog_courses_structured snapshot to export")
    manifest = load_manifest(snap)
    courses = json.loads((snap / "courses.json").read_text())
    out_dir = COMMITTED_ROOT / "courses"
    by_subject: dict[str, list[dict]] = {}
    for c in courses:
        by_subject.setdefault(c["subject"], []).append(c)

    written = skipped = 0
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
        if existing is not None:
            if existing.get("origin") == "hand-edited" and not force:
                print(f"  SKIP (hand-edited): courses/{subject}", file=sys.stderr)
                skipped += 1
                continue
            if _content_equal(existing, record):
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
    print(f"courses: {written} subject files written, {skipped} hand-edit skips, "
          f"{len(stale)} subjects removed")
    return written, skipped


def write_index() -> None:
    programs = sorted((COMMITTED_ROOT / "programs").glob("*.json"))
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
            "programs": len(programs),
            "subjects": len(subjects),
            "courses": n_courses,
        },
    )
    print(f"index: {len(programs)} programs, {len(subjects)} subjects, {n_courses} courses")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--courses", action="store_true", help="(default) export the course catalog")
    ap.add_argument("--legacy-programs", action="store_true",
                    help="re-export the frozen generic-JSON program harness (approach A)")
    ap.add_argument("--force", action="store_true", help="overwrite hand-edited files")
    args = ap.parse_args()
    if args.legacy_programs:
        export_programs(force=args.force)
    if args.courses or not args.legacy_programs:
        export_courses(force=args.force)
    write_index()


if __name__ == "__main__":
    main()
