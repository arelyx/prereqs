"""Fetch stage: program index pages + every program page → raw snapshot.

~121 requests (2 index + 75 majors + 44 minors), throttled. Program names and
degrees come from index anchor text — NEVER from slugs (CMS artifacts like
'copy-of-physics-bs' are live URLs; see research doc §1).
"""

from __future__ import annotations

import argparse
import re
import sys

from bs4 import BeautifulSoup

from common.guards import PipelineAbort, expect, expect_range
from common.http import PoliteSession
from common.snapshot import SnapshotWriter

BASE_URL = "https://catalog.ucsc.edu"
BACHELORS_INDEX = f"{BASE_URL}/en/current/general-catalog/academic-programs/bachelors-degrees"
MINORS_INDEX = f"{BASE_URL}/en/current/general-catalog/academic-programs/undergraduate-minors"

DEGREE_SUFFIX_RE = re.compile(r"(B\.A\.|B\.S\.|B\.M\.)\s*$")


def discover_programs(index_html: str, kind: str) -> list[dict]:
    soup = BeautifulSoup(index_html, "html.parser")
    programs = []
    seen = set()
    for a in soup.select("a[href*='/general-catalog/academic-units/']"):
        href = a["href"].split("#")[0]
        name = a.get_text(" ", strip=True)
        if not name or href in seen:
            continue
        seen.add(href)
        parts = href.strip("/").split("/")
        # .../academic-units/{division}/{department}/{slug}
        idx = parts.index("academic-units")
        division, department, slug = parts[idx + 1], parts[idx + 2], parts[-1]
        if kind == "major":
            m = DEGREE_SUFFIX_RE.search(name)
            expect(m is not None, "bachelor's index anchor lacks degree suffix", name=name)
            degree = m.group(1).replace(".", "")
        else:
            degree = "minor"
        programs.append(
            {
                "name": name,
                "degree": degree,
                "kind": kind,
                "division": division,
                "department": department,
                "slug": slug,
                "url": BASE_URL + href if href.startswith("/") else href,
            }
        )
    if kind == "major":
        expect_range(len(programs), 70, 85, "bachelor's program count")
    else:
        expect_range(len(programs), 38, 50, "minors count")
    return programs


def run(min_interval: float = 1.2, only_slugs: list[str] | None = None) -> None:
    session = PoliteSession(min_interval=min_interval)
    writer = SnapshotWriter("ucsc", "major_requirements")
    try:
        _run_inner(session, writer, only_slugs)
    except BaseException:
        writer.abort()
        raise


def _run_inner(session: PoliteSession, writer: SnapshotWriter, only_slugs) -> None:
    majors = discover_programs(session.get(BACHELORS_INDEX).text, "major")
    minors = discover_programs(session.get(MINORS_INDEX).text, "minor")
    programs = majors + minors
    if only_slugs:
        programs = [p for p in programs if p["slug"] in only_slugs]
        expect(bool(programs), "slug filter matched nothing", filter=only_slugs)

    writer.path("raw").mkdir(exist_ok=True)
    for p in programs:
        html = session.get(p["url"]).text
        expect_range(len(html), 20_000, 400_000, f"page size for {p['slug']}")
        (writer.path("raw") / f"{p['slug']}.html").write_text(html)
        print(f"  {p['slug']}", file=sys.stderr)

    writer.write_json("programs.json", programs)
    final = writer.finalize(
        {
            "stage": "fetch",
            "counts": {
                "majors": len([p for p in programs if p["kind"] == "major"]),
                "minors": len([p for p in programs if p["kind"] == "minor"]),
            },
        }
    )
    print(f"snapshot: {final}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--slugs", help="comma-separated program slugs (testing)")
    ap.add_argument("--min-interval", type=float, default=1.2)
    args = ap.parse_args()
    try:
        run(
            min_interval=args.min_interval,
            only_slugs=args.slugs.split(",") if args.slugs else None,
        )
    except PipelineAbort as exc:
        print(f"PIPELINE ABORTED: {exc}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
