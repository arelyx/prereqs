"""Fetch stage: catalog course pages → raw HTML + deterministic parse snapshot.

One request for the courses root (department discovery) plus one per
department (~88 requests, throttled). Guards run against the parsed result
BEFORE the snapshot is finalized; any violation discards staging and leaves
previous snapshots untouched.

Snapshot layout:
    raw/<dept-slug>.html      exact bytes fetched, for audit/reparse
    courses.json              deterministic per-course fields (parse.py)
    departments.json          slug/name/url/course counts
"""

from __future__ import annotations

import argparse
import sys

from common.guards import PipelineAbort, expect, expect_range
from common.http import PoliteSession
from common.snapshot import SnapshotWriter, latest, load_manifest

from . import parse

BASE_URL = "https://catalog.ucsc.edu"
COURSES_ROOT = f"{BASE_URL}/en/current/general-catalog/courses"

# A department can legitimately disappear on an edition roll (CLST in 2026-27).
# We report removals against the previous snapshot rather than failing, but a
# mass disappearance means the site changed shape.
MAX_REMOVED_DEPTS = 5


def run(dept_filter: str | None = None, min_interval: float = 1.2) -> None:
    session = PoliteSession(min_interval=min_interval)
    writer = SnapshotWriter("ucsc", "catalog_courses")
    try:
        result = _run_inner(session, writer, dept_filter)
    except BaseException:
        writer.abort()
        raise
    print(f"snapshot: {result}")


def _run_inner(session: PoliteSession, writer: SnapshotWriter, dept_filter: str | None):
    root_html = session.get(COURSES_ROOT).text
    year = parse.catalog_year(root_html)
    departments = parse.discover_departments(root_html, BASE_URL)
    if dept_filter:
        departments = [d for d in departments if d["slug"] == dept_filter]
        expect(bool(departments), "dept filter matched nothing", filter=dept_filter)

    previous = latest("ucsc", "catalog_courses")
    prev_counts: dict[str, int] = {}
    if previous is not None:
        prev_counts = load_manifest(previous).get("dept_course_counts", {})

    all_courses: list[dict] = []
    dept_summaries: list[dict] = []
    dept_course_counts: dict[str, int] = {}
    removed = [s for s in prev_counts if s not in {d["slug"] for d in departments}]
    if not dept_filter:
        expect(
            len(removed) <= MAX_REMOVED_DEPTS,
            "too many departments disappeared vs previous snapshot",
            removed=removed,
        )

    for dept in departments:
        html = session.get(dept["url"]).text
        writer.path("raw").mkdir(exist_ok=True)
        (writer.path("raw") / f"{dept['slug']}.html").write_text(html)

        parsed = parse.parse_department(html, dept["slug"], dept["name"], dept["url"])
        expect(
            not parsed.unknown_classes,
            "unknown course-block classes (schema drift — see parse.KNOWN_BLOCK_CLASSES)",
            dept=dept["slug"],
            classes=sorted(parsed.unknown_classes),
        )
        prev = prev_counts.get(dept["slug"])
        if prev and prev >= 20:
            expect_range(
                len(parsed.courses), prev * 0.85, prev * 1.15,
                f"course count for {dept['slug']} vs previous snapshot",
            )
        dept_course_counts[dept["slug"]] = len(parsed.courses)
        dept_summaries.append(
            {
                **dept,
                "courses": len(parsed.courses),
                "cross_listed_tail": parsed.cross_listed_tail,
                "unknown_extra_labels": sorted(parsed.unknown_extra_labels),
            }
        )
        all_courses.extend(parsed.courses)
        print(f"  {dept['slug']}: {len(parsed.courses)} courses", file=sys.stderr)

    if not dept_filter:
        expect_range(len(all_courses), 5500, 7000, "total course count")
    codes_seen = [c["code"] for c in all_courses]
    expect(
        len(codes_seen) == len(set(codes_seen)),
        "duplicate course codes across departments",
        dupes=[c for c in set(codes_seen) if codes_seen.count(c) > 1][:10],
    )

    writer.write_json("courses.json", all_courses)
    writer.write_json("departments.json", dept_summaries)
    unknown_labels = sorted({l for d in dept_summaries for l in d["unknown_extra_labels"]})
    return writer.finalize(
        {
            "stage": "fetch",
            "catalog_year": year,
            "dept_course_counts": dept_course_counts,
            "counts": {
                "departments": len(dept_summaries),
                "courses": len(all_courses),
                "with_requirements": sum(1 for c in all_courses if c["raw_requirements"]),
                "with_ge": sum(1 for c in all_courses if c["ge_codes"]),
            },
            "removed_departments": removed,
            "unknown_extra_labels": unknown_labels,
        }
    )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dept", help="only fetch one department slug (testing)")
    ap.add_argument("--min-interval", type=float, default=1.2)
    args = ap.parse_args()
    try:
        run(dept_filter=args.dept, min_interval=args.min_interval)
    except PipelineAbort as exc:
        print(f"PIPELINE ABORTED: {exc}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
