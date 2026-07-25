"""PROTOTYPE fetch: UC San Diego catalog course pages — NOT integrated.

Fetches one or two subject pages (hand-maintained static HTML: everything is
packed into p.course-name / p.course-descriptions pairs), parses per-course
fields deterministically, and snapshots them. Purpose: verify the SHAPE of
UCSD data against the normalized schema (docs/universities/ucsd/source-catalog.md).
No subject discovery, no LLM stage, no DB loading.

    python -m ucsd.catalog_courses.fetch               # CSE + MATH, ~2 requests
"""

from __future__ import annotations

import argparse
import re
import sys

from bs4 import BeautifulSoup

from common.guards import PipelineAbort, expect
from common.http import PoliteSession
from common.snapshot import SnapshotWriter

BASE_URL = "https://catalog.ucsd.edu"
DEFAULT_SUBJECTS = ("CSE", "MATH")

# "CSE 3. Title (4)"; cross-listed "CSE 241A/ECE 260B. Title (4)";
# sequences "MATH 220A-B-C. Title (4-4-4)". Units: "4", "2 or 4", "1–4"
# (en-dash), "1 to 4", "4-4-4".
NAME_RE = re.compile(
    r"^(?P<codes>[A-Z]{2,5} \d+[A-Z]{0,2}(?:-[A-Z](?:-[A-Z])*)?"
    r"(?:/[A-Z]{2,5} \d+[A-Z]{0,2})*)[.:]\s*"
    r"(?P<title>.+?)\s*\((?P<units>[\d ,orto.–-]+)\)$"
)
PREREQ_MARKER = re.compile(r"Prerequisites:\s*", re.IGNORECASE)

DIVISIONS = {"Lower Division": "lower", "Upper Division": "upper", "Graduate": "graduate"}


def parse_subject(html: str, subject: str, min_courses: int = 100) -> tuple[list[dict], set[str]]:
    """All course entries on a subject page -> (courses, nonstandard subheads)."""
    soup = BeautifulSoup(html, "html.parser")
    names = soup.select("p.course-name")
    descs = soup.select("p.course-descriptions")
    expect(len(names) >= min_courses, "implausibly few courses", subject=subject, count=len(names))
    expect(
        len(names) == len(descs),
        "course-name / course-descriptions count mismatch",
        subject=subject, names=len(names), descs=len(descs),
    )

    unknown_subheads: set[str] = set()
    courses = []
    for name_p, desc_p in zip(names, descs):
        division = ""
        subhead = name_p.find_previous("h2", class_="course-subhead-1")
        if subhead is not None:
            label = subhead.get_text(" ", strip=True)
            division = DIVISIONS.get(label, "")
            if not division:
                unknown_subheads.add(label)
        courses.append(_parse_course(name_p, desc_p, subject, division))
    return courses, unknown_subheads


def _parse_course(name_p, desc_p, subject: str, division: str) -> dict:
    # Strip trailing "Tag: ..." / "Tags: ..." annotations (CSE) before matching.
    name = re.sub(r"\s*Tags?:.*$", "", name_p.get_text(" ", strip=True))
    name = re.sub(r"\s+", " ", name).replace(" ", " ").strip()
    m = NAME_RE.match(name)
    expect(m is not None, "unparseable course-name", subject=subject, name=name[:80])

    codes = m.group("codes")
    primary = codes.split("/")[0]
    is_sequence = bool(re.search(r"\d+[A-Z]-[A-Z]", primary))
    expect(
        primary.split()[0] == subject,
        "course filed under foreign subject", subject=subject, code=primary,
    )

    desc = re.sub(r"\s+", " ", desc_p.get_text(" ", strip=True))
    prereq = None
    marker = PREREQ_MARKER.search(desc)
    if marker:
        prereq = desc[marker.end():].strip() or None
        desc = desc[: marker.start()].strip()

    anchor = None
    parent = name_p.find_previous_sibling("p", class_="anchor-parent")
    if parent is not None and parent.select_one("a.anchor"):
        anchor = parent.select_one("a.anchor").get("id")

    return {
        "code": primary.replace(" ", ""),
        "display_code": primary,
        "all_codes": [c.strip().replace(" ", "") for c in codes.split("/")],
        "subject": subject,
        "title": m.group("title"),
        "credits": m.group("units").replace("–", "-"),
        "division": division,
        "description": desc,
        "raw_prerequisites": prereq,
        "anchor": anchor,
        "is_cross_listed": "/" in codes,
        "is_sequence": is_sequence,
    }


def run(subjects: tuple[str, ...], min_interval: float = 1.5) -> None:
    session = PoliteSession(min_interval=min_interval)
    writer = SnapshotWriter("ucsd", "catalog_courses")
    try:
        all_courses, counts, unknown = [], {}, set()
        for subj in subjects:
            html = session.get(f"{BASE_URL}/courses/{subj}.html").text
            writer.path("raw").mkdir(exist_ok=True)
            (writer.path("raw") / f"{subj}.html").write_text(html)
            courses, subheads = parse_subject(html, subj)
            unknown |= subheads
            counts[subj] = len(courses)
            all_courses.extend(courses)
            print(f"  {subj}: {len(courses)} courses", file=sys.stderr)

        codes = [c["code"] for c in all_courses]
        expect(len(codes) == len(set(codes)), "duplicate course codes")
        writer.write_json("courses.json", all_courses)
        snapshot = writer.finalize({
            "stage": "fetch-prototype",
            "subjects": list(subjects),
            "counts": {
                "courses": len(all_courses),
                "with_prereqs": sum(1 for c in all_courses if c["raw_prerequisites"]),
                "cross_listed": sum(1 for c in all_courses if c["is_cross_listed"]),
                "sequences": sum(1 for c in all_courses if c["is_sequence"]),
                **{f"subject_{s}": n for s, n in counts.items()},
            },
            "nonstandard_subheads": sorted(unknown),
        })
    except BaseException:
        writer.abort()
        raise
    print(f"snapshot: {snapshot}")
    print(f"total: {len(all_courses)} courses across {len(subjects)} subjects")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--subjects", nargs="+", default=list(DEFAULT_SUBJECTS))
    args = ap.parse_args()
    try:
        run(tuple(args.subjects))
    except PipelineAbort as exc:
        print(f"PIPELINE ABORTED: {exc}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
