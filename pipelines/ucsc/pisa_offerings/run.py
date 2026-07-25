"""CLI orchestrator: fetch -> parse -> guards -> snapshot for UCSC pisa offerings.

    python -m ucsc.pisa_offerings.run --terms 2260,2262
    python -m ucsc.pisa_offerings.run --from 2048 --to 2268

One POST per term (see fetch.py), so even a full 2004-2026 backfill is under
90 requests. Any guard violation aborts the run and discards the staging dir;
a snapshot only becomes visible if every term passed every guard
(docs/ARCHITECTURE.md fail-fast contract).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from common import codes
from common.guards import PipelineAbort, expect, expect_range
from common.http import PoliteSession
from common.snapshot import SnapshotWriter

from . import fetch, parse, terms

# Plausible primary-section counts per term. Fall/winter/spring quarters run
# ~1,400-1,700 sections back to 2004; summer is far smaller. Below the floor
# means the search silently narrowed (e.g. reg_status default snapped back to
# open-only); above the cap means rec_dur is no longer generous enough.
ROW_COUNT_RANGE: dict[str, tuple[int, int]] = {
    "winter": (200, 3000),
    "spring": (200, 3000),
    "summer": (50, 3000),
    "fall": (200, 3000),
}


def run(term_codes: list[str], min_interval: float = 1.5) -> Path:
    """Fetch, parse, and snapshot the given terms. Returns the snapshot dir."""
    term_codes = sorted(set(term_codes), key=terms.sort_key)
    session = PoliteSession(min_interval=min_interval, timeout=120, retries=5)  # ~5-7 MB pages; upstream 504s/timeouts under backfill load
    writer = SnapshotWriter("ucsc", "pisa_offerings")
    try:
        htmls = fetch.fetch_terms(session, term_codes, writer)

        offerings: list[dict] = []
        term_rows: list[dict] = []
        for code in term_codes:
            rows = parse.parse_results(htmls[code], code)
            year, season = terms.parse_code(code)

            if not rows:
                # A published term always has classes; only a not-yet-opened
                # future term may legitimately return the zero-results page.
                expect(
                    terms.is_future(code),
                    "zero results for a term that should have started",
                    term=code,
                )
            else:
                lo, hi = ROW_COUNT_RANGE[season]
                expect_range(len(rows), lo, hi, f"row count for {season} term", term=code)

            for row in rows:
                expect(
                    codes.is_course_id(row["course_code"]),
                    "course code does not match the canonical code regex",
                    term=code, course_code=row["course_code"],
                    class_number=row["class_number"],
                )

            offerings.extend(rows)
            term_rows.append({
                "term_code": code,
                "year": year,
                "season": season,
                "academic_year": terms.academic_year(code),
                "sort_key": terms.sort_key(code),
                "row_count": len(rows),
            })
            print(f"  {code} ({season} {year}): {len(rows)} rows", file=sys.stderr)

        writer.write_json("offerings.json", offerings)
        writer.write_json("terms.json", term_rows)
        return writer.finalize({
            "params": {"rec_dur": fetch.REC_DUR, "min_interval": min_interval},
            "counts": {
                "terms": len(term_rows),
                "offerings": len(offerings),
                "rows_per_term": {t["term_code"]: t["row_count"] for t in term_rows},
            },
        })
    except BaseException:
        writer.abort()
        raise


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--terms", help="comma-separated term codes, e.g. 2260,2262")
    ap.add_argument("--from", dest="from_code", help="first term code of an inclusive range")
    ap.add_argument("--to", dest="to_code", help="last term code of an inclusive range")
    ap.add_argument("--min-interval", type=float, default=1.5,
                    help="minimum seconds between requests (default 1.5)")
    args = ap.parse_args(argv)

    if args.terms and (args.from_code or args.to_code):
        ap.error("use either --terms or --from/--to, not both")
    if args.terms:
        term_codes = [t.strip() for t in args.terms.split(",") if t.strip()]
    elif args.from_code and args.to_code:
        term_codes = terms.enumerate_codes(args.from_code, args.to_code)
    else:
        ap.error("provide --terms or both --from and --to")
    if not term_codes:
        ap.error("no term codes given")
    for code in term_codes:
        try:
            terms.parse_code(code)
        except ValueError as exc:
            ap.error(str(exc))
    args.term_codes = term_codes
    return args


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    try:
        snapshot_dir = run(args.term_codes, min_interval=args.min_interval)
    except PipelineAbort as exc:
        print(f"ABORTED (staging discarded): {exc}", file=sys.stderr)
        return 1
    print(snapshot_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
