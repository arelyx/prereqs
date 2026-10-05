"""Structure stage runner: fetch snapshot → typed requirements snapshot.

LEGACY generic-JSON harness (approach A). For each program: segment
(deterministic) → interpret rules (regex patterns; unmatched → needs_review)
→ cross-reference every course code against the
newest catalog_courses snapshot. A program whose segmentation throws is
quarantined (recorded, requirements=null) — one weird page must not kill the
run — but the FailureBudget aborts if >10% of programs fail (systemic drift).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from common.guards import FailureBudget, PipelineAbort, ScrapeDriftError, expect
from common.snapshot import SnapshotWriter, latest, load_manifest

from .. import editions
from . import segment, structure


def run(
    fetch_snapshot: Path | None = None,
    only_slugs: list[str] | None = None,
    edition: str | None = None,
) -> None:
    src = fetch_snapshot or editions.latest_program_fetch(edition)
    expect(src is not None, "no major_requirements fetch snapshot")
    programs = json.loads((src / "programs.json").read_text())
    if only_slugs:
        programs = [p for p in programs if p["slug"] in only_slugs]

    catalog_snapshot = latest("ucsc", "catalog_courses_structured") or latest(
        "ucsc", "catalog_courses"
    )
    catalog_codes: set[str] = set()
    if catalog_snapshot is not None:
        catalog_codes = {
            c["code"]
            for c in json.loads((catalog_snapshot / "courses.json").read_text())
        }
    else:
        print("WARNING: no catalog snapshot; skipping course cross-reference", file=sys.stderr)

    budget = FailureBudget(total=len(programs), max_ratio=0.10)
    writer = SnapshotWriter("ucsc", "major_requirements_structured")
    try:
        _run_inner(writer, programs, src, catalog_codes, budget)
    except BaseException:
        writer.abort()
        raise


def _run_inner(writer, programs, src, catalog_codes, budget) -> None:
    results = []
    unmatched = 0
    for meta in programs:
        html_path = src / "raw" / f"{meta['slug']}.html"
        try:
            seg = segment.segment_program(html_path.read_text(), meta["name"], meta["url"])
            record = structure.build_program(seg, meta, budget)
        except ScrapeDriftError as exc:
            budget.record(meta["slug"], str(exc))
            record = {**meta, "requirements": None, "error": str(exc)}
            results.append(record)
            print(f"  QUARANTINED {meta['slug']}: {exc}", file=sys.stderr)
            continue

        unknown = sorted(
            {
                c
                for s in record["requirements"]["sections"]
                for r in s["rules"]
                for c in (r["courses"] or []) + [x for b in (r["branches"] or []) for x in b]
                if catalog_codes and c not in catalog_codes
            }
        )
        record["unresolved_codes"] = unknown
        stats = record.pop("stats")
        unmatched += stats["unmatched"]
        record["needs_review_rules"] = stats["needs_review"]
        results.append(record)
        print(
            f"  {meta['slug']}: {stats['rules']} rules, "
            f"{stats['unmatched']} unmatched, {stats['needs_review']} need review, "
            f"{len(unknown)} unresolved codes",
            file=sys.stderr,
        )

    writer.write_json("programs.json", results)
    final = writer.finalize(
        {
            "stage": "structured",
            "source_snapshot": str(src),
            "edition": load_manifest(src).get("edition"),
            "counts": {
                "programs": len(results),
                "quarantined": len(budget.failures),
                "unmatched_rules": unmatched,
                "needs_review_rules": sum(r.get("needs_review_rules", 0) for r in results),
            },
            "failures": budget.failures,
        }
    )
    print(f"snapshot: {final}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--fetch-snapshot", type=Path)
    ap.add_argument("--edition", help="catalog edition, e.g. 2026-27 (default: newest fetched)")
    ap.add_argument("--slugs", help="comma-separated program slugs")
    args = ap.parse_args()
    try:
        run(
            fetch_snapshot=args.fetch_snapshot,
            edition=args.edition,
            only_slugs=args.slugs.split(",") if args.slugs else None,
        )
    except PipelineAbort as exc:
        print(f"PIPELINE ABORTED: {exc}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
