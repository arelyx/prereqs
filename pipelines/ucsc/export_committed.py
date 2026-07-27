"""Export structured pipeline output into the git-committed dataset.

data-committed/ucsc/ is the CANONICAL home of near-static, trust-sensitive
catalog data (course catalog + program requirements). The Local-LLM pipeline
proposes; this exporter writes its proposal into the committed tree so that
`git diff` is the review artifact — a human and/or the Frontier LLM approves
deltas before merge. The database is a disposable projection loaded from
these files. Offerings history stays OUT (bulky, per-term, deterministic —
no trust problem; lives in data/ snapshots only).

Preservation rules (the trust model):
- A file whose `origin` is 'hand-edited' is NEVER overwritten without
  --force; the exporter reports the skip so drift stays visible.
- A `verification` block (status frontier-verified) survives an export only
  when the exported content is identical to the existing content; any change
  resets status to 'unverified' so stale approvals can't linger.

Layout (stable ordering, one entity per file → reviewable diffs):
  data-committed/ucsc/index.json
  data-committed/ucsc/programs/<slug>.json
  data-committed/ucsc/courses/<SUBJECT>.json

Usage:
  python -m ucsc.export_committed [--programs] [--courses] [--force]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from common.snapshot import DATA_ROOT, latest, load_manifest

COMMITTED_ROOT = DATA_ROOT.parent / "data-committed" / "ucsc"

PROGRAM_META_KEYS = (
    "slug", "name", "degree", "kind", "division", "department", "url",
)


def _dump(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=1, ensure_ascii=False, sort_keys=True) + "\n")


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
            "origin": "local-llm-pipeline",
            "provenance": {
                "snapshot": snap.name,
                "model": manifest.get("model"),
                "prompt_version": manifest.get("prompt_version"),
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
    print(f"courses: {written} subject files written, {skipped} hand-edit skips")
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
    ap.add_argument("--programs", action="store_true")
    ap.add_argument("--courses", action="store_true")
    ap.add_argument("--force", action="store_true", help="overwrite hand-edited files")
    args = ap.parse_args()
    do_all = not (args.programs or args.courses)
    if args.programs or do_all:
        export_programs(force=args.force)
    if args.courses or do_all:
        export_courses(force=args.force)
    write_index()


if __name__ == "__main__":
    main()
