"""Render a program page's requirements zone as reviewable text.

Verification helper: prints headings (with their sc-RequiredCoursesHeading
level), course-table rows (narrative markers annotated), prose, list items,
and requirement notes from the NEWEST fetch snapshot's raw HTML — no network.
This is the ground truth a verifier compares the committed JSON against.

Usage: python -m ucsc.major_requirements.render_page <slug>
"""

from __future__ import annotations

import re
import sys

from bs4 import BeautifulSoup

from common.snapshot import latest

from .segment import HEADING_CLASS_RE, PLANNER_TITLE_RE


def render(slug: str) -> str:
    snap = latest("ucsc", "major_requirements")
    if snap is None:
        sys.exit("no major_requirements fetch snapshot")
    path = snap / "raw" / f"{slug}.html"
    if not path.exists():
        sys.exit(f"no raw page for slug {slug!r} in {snap}")
    soup = BeautifulSoup(path.read_text(), "html.parser")
    main = soup.find("h1").parent

    out: list[str] = [f"### SOURCE PAGE: {slug} (snapshot {snap.name})"]
    in_planners = False
    for el in main.descendants:
        name = getattr(el, "name", None)
        if name == "h2":
            t = el.get_text(" ", strip=True)
            in_planners = False
            out.append(f"\n==== H2: {t}")
        elif name in ("h3", "h4", "h5", "h6"):
            t = el.get_text(" ", strip=True)
            cls = " ".join(el.get("class") or [])
            m = HEADING_CLASS_RE.search(cls)
            if PLANNER_TITLE_RE.search(t):
                in_planners = True
                out.append(f"\n[{name}] {t}  <<< PLANNERS (excluded from requirements)")
                continue
            in_planners = False
            lvl = f" sc-level-{m.group(1)}" if m else " (unclassed)"
            out.append(f"\n[{name}{lvl}] {t}")
        elif in_planners:
            continue
        elif name == "td" and "sc-coursenumber" in (el.get("class") or []):
            a = el.find("a")
            href = a.get("href", "") if a else ""
            txt = el.get_text(" ", strip=True)
            if "narrative-courses" in href:
                label = txt or (a.get_text(" ", strip=True) if a else "")
                out.append(f"    >> NARRATIVE MARKER [{href.split('/')[-1]}]: '{label}'")
            elif txt:
                out.append(f"    * {txt}")
        elif name == "div" and "sc-requirementsNote" in (el.get("class") or []):
            out.append(f"  NOTE: {el.get_text(' ', strip=True)}")
        elif name == "p" and not el.find_parent("table"):
            t = el.get_text(" ", strip=True)
            if t:
                out.append(f"  P: {t}")
        elif name == "li" and not el.find_parent("table"):
            t = el.get_text(" ", strip=True)
            if t:
                out.append(f"  LI: {t}")
    return "\n".join(out)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python -m ucsc.major_requirements.render_page <slug>")
    print(render(sys.argv[1]))
