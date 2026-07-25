"""Run the SOE planned-schedule pipeline: fetch -> parse -> guards -> snapshot.

Usage (from pipelines/, venv active):

    python -m ucsc.soe_schedule.run

Output snapshot: data/ucsc/soe_schedule/<ts>/ with raw/<dept>.html per
department, planned.json (all planned offerings), and manifest.json with
per-department course/offering counts. Any guard violation aborts before the
snapshot is finalized — the staging dir is discarded and previous snapshots
stay untouched (docs/ARCHITECTURE.md fail-fast contract).
"""

from __future__ import annotations

from common.guards import expect, expect_range
from common.http import PoliteSession
from common.snapshot import SnapshotWriter

from . import fetch, parse

# Plausibility floors per department (landing-page course counts, July 2026:
# am 50, bme 99, cmpm 88, cse 230, ece 145, game 28, hci 11, nlp 14, stat 41,
# tim 28). Floors are deliberately loose; hci/nlp are the small ones.
MIN_COURSES = {"cse": 100}
MIN_COURSES_DEFAULT = 5
TOTAL_COURSES_RANGE = (400, 1200)


def main() -> None:
    writer = SnapshotWriter("ucsc", "soe_schedule")
    try:
        session = PoliteSession(min_interval=1.5)
        pages = fetch.fetch_department_pages(session, writer)

        offerings: list[dict] = []
        per_dept: dict[str, dict] = {}
        academic_year: str | None = None
        for dept, html in pages.items():
            result = parse.parse_department(dept, html)
            n_courses = len(result["courses"])
            expect(
                n_courses >= MIN_COURSES.get(dept, MIN_COURSES_DEFAULT),
                "implausibly few courses for department",
                dept=dept, courses=n_courses,
            )
            if academic_year is None:
                academic_year = result["academic_year"]
            expect(
                result["academic_year"] == academic_year,
                "departments disagree on academic year (mid-rollover scrape?)",
                dept=dept, got=result["academic_year"], first=academic_year,
            )
            offerings.extend(result["offerings"])
            per_dept[dept] = {"courses": n_courses, "offerings": len(result["offerings"])}

        total_courses = sum(d["courses"] for d in per_dept.values())
        expect_range(total_courses, *TOTAL_COURSES_RANGE, "total SOE courses across departments")

        writer.write_json("planned.json", offerings)
        snapshot = writer.finalize({
            "academic_year": academic_year,
            "counts": {
                "departments": len(per_dept),
                "courses": total_courses,
                "offerings": len(offerings),
                "per_department": per_dept,
            },
        })
        print(f"snapshot: {snapshot}")
        print(f"academic year: {academic_year}")
        for dept in fetch.DEPARTMENTS:
            d = per_dept[dept]
            print(f"  {dept:5s} {d['courses']:4d} courses  {d['offerings']:4d} planned offerings")
        print(f"total: {total_courses} courses, {len(offerings)} planned offerings")
    except BaseException:
        writer.abort()
        raise


if __name__ == "__main__":
    main()
