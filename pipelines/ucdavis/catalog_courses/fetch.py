"""PROTOTYPE fetch: UC Davis catalog course pages (CourseLeaf) — NOT integrated.

Fetches one or two subject pages, parses per-course fields deterministically,
and snapshots them. Purpose: verify the SHAPE of Davis data against the
normalized schema (docs/universities/ucdavis/source-catalog.md). No subject
discovery, no LLM stage, no DB loading.

    python -m ucdavis.catalog_courses.fetch            # ECS + MAT, ~2 requests
"""

from __future__ import annotations

import argparse
import re
import sys

from bs4 import BeautifulSoup, Tag

from common.guards import PipelineAbort, expect
from common.http import PoliteSession
from common.snapshot import SnapshotWriter

BASE_URL = "https://catalog.ucdavis.edu"
DEFAULT_SUBJECTS = ("ecs", "mat")

# Davis pads course numbers to 3 digits: "ECS 036A", "MAT 000B".
CODE_RE = re.compile(r"^[A-Z]{2,4} \d{3}[A-Z]{0,2}$")
UNITS_RE = re.compile(r"^\((\d+(?:-\d+)?) units?\)$")

# Labeled-extras vocabulary observed 2026-07-25; new labels are surfaced in the
# manifest, not dropped (drift announces itself).
KNOWN_LABELS = {
    "Learning Activities:", "Grade Mode:", "Enrollment Restriction(s):",
    "General Education:", "Repeat Credit:", "Credit Limitation(s):",
    "Cross Listing:", "Course Description:", "Prerequisite(s):",
}

GE_ABBR_RE = re.compile(r"\(([A-Z]{2,4})\)")


def parse_subject(html: str, subject: str, min_courses: int = 30) -> tuple[list[dict], set[str]]:
    """All courseblocks on a subject page -> (courses, unknown extras labels)."""
    soup = BeautifulSoup(html, "html.parser")
    blocks = soup.select("div.courseblock")
    expect(len(blocks) >= min_courses, "implausibly few courseblocks", subject=subject, count=len(blocks))
    unknown_labels: set[str] = set()
    return [_parse_block(b, subject, unknown_labels) for b in blocks], unknown_labels


def _parse_block(block: Tag, subject: str, unknown_labels: set[str]) -> dict:
    def header(cls: str) -> str:
        el = block.select_one(f"h3 span.detail-{cls} b")
        expect(el is not None, f"courseblock missing detail-{cls}", subject=subject)
        return el.get_text(" ", strip=True)

    display_code = header("code")
    expect(CODE_RE.match(display_code) is not None, "unexpected code shape", code=display_code)
    # Titles render as "— Data, Logic, & Computing" (em-dash + nbsp prefix).
    title = re.sub(r"^[—–-]\s*", "", header("title")).strip()
    expect(bool(title), "empty title", code=display_code)
    units_raw = header("hours_html")
    m = UNITS_RE.match(units_raw)
    expect(m is not None, "unexpected units shape", code=display_code, units=units_raw)

    # Description: the first courseblockextra paragraph labeled "Course Description:".
    description, superseded = "", False
    for p in block.select("p.courseblockextra"):
        text = p.get_text(" ", strip=True)
        if "Course Description:" in text:
            pre, _, description = text.partition("Course Description:")
            superseded = "This version has ended" in pre
            description = description.strip()
            break

    prereq = None
    p = block.select_one("p.detail-prerequisite")
    if p is not None:
        prereq = re.sub(r"\s+", " ", p.get_text(" ", strip=True))
        prereq = re.sub(r"^Prerequisite\(s\):\s*", "", prereq)

    # Labeled extras: parse ONLY the visible notinpdf copy (a hidden duplicate
    # exists) and only its first <ul> (a second <ul> holds a superseding
    # version's fields — see doc §3.2).
    extras: dict[str, str] = {}
    ul = block.select_one("div.notinpdf div.courseblockextra ul")
    for li in ul.select("li") if ul else []:
        label_el = li.select_one("span.label em")
        if label_el is None:
            continue
        label = label_el.get_text(strip=True)
        body = li.get_text(" ", strip=True).replace(label_el.get_text(" ", strip=True), "", 1)
        extras[label] = re.sub(r"\s+", " ", body).strip()
        if label not in KNOWN_LABELS:
            unknown_labels.add(label)

    ge_text = extras.get("General Education:", "")
    return {
        "code": display_code.replace(" ", ""),
        "display_code": display_code,
        "subject": subject.upper(),
        "title": title,
        "credits": m.group(1),
        "description": description,
        "raw_prerequisites": prereq,
        "ge_codes": GE_ABBR_RE.findall(ge_text),
        "cross_listed": extras.get("Cross Listing:", "").strip(" .") or None,
        "extra_fields": extras,
        "has_updated_version": superseded,
    }


def run(subjects: tuple[str, ...], min_interval: float = 1.5) -> None:
    session = PoliteSession(min_interval=min_interval)
    writer = SnapshotWriter("ucdavis", "catalog_courses")
    try:
        all_courses, counts, unknown = [], {}, set()
        for subj in subjects:
            html = session.get(f"{BASE_URL}/courses-subject-code/{subj}/").text
            writer.path("raw").mkdir(exist_ok=True)
            (writer.path("raw") / f"{subj}.html").write_text(html)
            courses, labels = parse_subject(html, subj)
            unknown |= labels
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
                "with_ge": sum(1 for c in all_courses if c["ge_codes"]),
                **{f"subject_{s}": n for s, n in counts.items()},
            },
            "unknown_extra_labels": sorted(unknown),
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
