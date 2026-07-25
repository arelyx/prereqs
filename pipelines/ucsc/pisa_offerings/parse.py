"""Parse stage: one pisa results page -> list of offering dicts.

Every structural assumption from the research doc is an expect() call; a page
that stops matching aborts the run (fail-fast contract, docs/ARCHITECTURE.md).
BeautifulSoup's ``html.parser`` is used deliberately: the pages contain
invalid HTML (stray ``</span>`` closers, uppercase ``<H2>``) and html.parser
is lenient without an extra dependency.

Output dict shape mirrors DATA_MODEL.md course_offerings: term_code,
course_code (canonical, e.g. 'CSE101'), display_code ('CSE 101'), section,
class_number, title, instructors ([{name}], 'Staff' kept literally),
days_times, location, modality, enrolled, capacity, status.
"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup, Tag

from common import codes
from common.guards import expect

# Fail-fast marker #1: "<b>1</b> - <b>N</b> of <b>TOTAL</b>". Regexed on the
# raw HTML (it sits outside any useful element).
COUNT_LINE_RE = re.compile(r"<b>(\d+)</b> - <b>(\d+)</b> of <b>(\d+)</b>")

# A zero-hit search renders this instead of a count line; anything with
# neither is a page-shape change.
ZERO_RESULTS_MARKER = "Sorry. Your search:"

ROWPANEL_ID_RE = re.compile(r"^rowpanel_\d+$")

# Heading link text: "SUBJ CATNBR - SECT\xa0\xa0\xa0Short Title" (the triple
# &nbsp; decodes to \xa0\xa0\xa0). Section is usually two digits, but
# historical terms also have 'EXTN' (UNEX sections, e.g. Fall 2014 CMPS 115)
# and bare single digits ('PHYE 9C - 3'), so accept 1-4 uppercase
# alphanumerics — looser than the research doc's `\d+\w*`.
HEADING_SPLIT = "\xa0\xa0\xa0"
HEADING_RE = re.compile(r"^([A-Z]+) (\S+) - ([0-9A-Z]{1,4})$")

ENROLLED_RE = re.compile(r"(\d+) of (\d+) Enrolled")


def parse_page(html: str, term_code: str) -> tuple[list[dict], int, int, int]:
    """Parse one results page (any window). Returns (rows, first, last, total).

    (rows, 0, 0, 0) only for a genuine zero-results page — the caller decides
    whether that is acceptable (future term); this function only distinguishes
    "empty" from "changed shape". The rowpanel count must equal the count
    line's window size.
    """
    count = COUNT_LINE_RE.search(html)
    if count is None:
        expect(
            ZERO_RESULTS_MARKER in html,
            "results page has neither a count line nor the zero-results marker",
            term=term_code,
        )
        return [], 0, 0, 0

    first, last, total = (int(g) for g in count.groups())
    soup = BeautifulSoup(html, "html.parser")
    panels = soup.find_all("div", id=ROWPANEL_ID_RE)
    expect(
        len(panels) == last - first + 1,
        "rowpanel count != count-line window",
        term=term_code, panels=len(panels), first=first, last=last,
    )
    return [_parse_panel(panel, term_code) for panel in panels], first, last, total


def parse_results(html: str, term_code: str) -> list[dict]:
    """Parse a results page that must cover ALL rows (single-page terms)."""
    rows, first, last, total = parse_page(html, term_code)
    if total == 0:
        return []
    expect(first == 1, "count line does not start at row 1", term=term_code, first=first)
    expect(
        last == total,
        "single request did not cover all rows",
        term=term_code, covered=last, total=total,
    )
    return rows


def _parse_panel(panel: Tag, term_code: str) -> dict:
    panel_id = panel.get("id")

    # Fail-fast marker #2: exactly one CLASS_NBR hidden input, and the heading
    # link id must carry the same number.
    nbr_inputs = panel.find_all("input", attrs={"name": "class_data[:CLASS_NBR]"})
    expect(
        len(nbr_inputs) == 1,
        "rowpanel does not contain exactly one CLASS_NBR input",
        term=term_code, panel=panel_id, found=len(nbr_inputs),
    )
    class_number = nbr_inputs[0]["value"]
    link = panel.find("a", id=f"class_id_{class_number}")
    expect(
        link is not None,
        "heading link id does not match CLASS_NBR input",
        term=term_code, panel=panel_id, class_number=class_number,
    )

    # Fail-fast marker #3: heading splits in two on the triple &nbsp; and the
    # left half is "SUBJ CATNBR - SECT".
    parts = link.get_text().split(HEADING_SPLIT)
    expect(
        len(parts) == 2,
        "heading text does not split into code/title on triple-nbsp",
        term=term_code, panel=panel_id, heading=link.get_text(),
    )
    # Upstream typos exist: Spring 2022 has 'PHYE 15B - 03`' (stray backtick
    # on the section). Strip trailing punctuation junk before matching.
    m = HEADING_RE.match(parts[0].strip().rstrip("`'´."))
    expect(
        m is not None,
        "heading code part does not match 'SUBJ CATNBR - SECT'",
        term=term_code, panel=panel_id, code_part=parts[0].strip(),
    )
    subject, catalog_nbr, section = m.groups()
    display_code = f"{subject} {catalog_nbr}"
    course_code = codes.normalize(display_code)

    heading = panel.find(class_="panel-heading")
    status_img = heading.find("img", alt=True) if heading else None
    expect(
        status_img is not None,
        "no status icon in panel heading",
        term=term_code, panel=panel_id,
    )

    instructors = _instructor_names(panel)
    expect(
        len(instructors) >= 1,
        "no instructor text (not even the Staff placeholder)",
        term=term_code, panel=panel_id, class_number=class_number,
    )

    enrolled_m = ENROLLED_RE.search(panel.get_text())
    expect(
        enrolled_m is not None,
        "no 'N of M Enrolled' text in rowpanel",
        term=term_code, panel=panel_id, class_number=class_number,
    )

    return {
        "term_code": term_code,
        "course_code": course_code,
        "display_code": display_code,
        "section": section,
        "class_number": class_number,
        "title": parts[1].strip(),
        "instructors": [{"name": n} for n in instructors],
        "days_times": _labeled_text(panel, "Day and Time:"),
        "location": _labeled_text(panel, "Location:"),
        "modality": _modality(panel),
        "enrolled": int(enrolled_m.group(1)),
        "capacity": int(enrolled_m.group(2)),
        "status": status_img["alt"],
    }


def _instructor_names(panel: Tag) -> list[str]:
    """Names from the instructor div; multiple instructors are <br>-separated.

    Each name sits in its own text node between <br> tags, so iterating the
    div's strings (rather than splitting get_text, which would fuse
    'Tsing,A.L.Gutierrez,K.') yields one name per node. The literal 'Staff'
    placeholder is kept as a name — downstream treats it as TBD.
    """
    label = panel.find("i", class_="sr-only", string="Instructor:")
    if label is None:
        return []
    return [s for s in (t.strip() for t in label.parent.stripped_strings) if s and s != "Instructor:"]


def _labeled_text(panel: Tag, label: str) -> str | None:
    """Text following an sr-only label inside its div; None if the div is absent.

    Absent divs are tolerated (historical rows are sparser); the guarded
    fields are asserted separately in _parse_panel.
    """
    tag = panel.find("i", class_="sr-only", string=label)
    if tag is None:
        return None
    text = " ".join(s for s in (t.strip() for t in tag.parent.stripped_strings) if s and s != label)
    return text


def _modality(panel: Tag) -> str | None:
    tag = panel.find("i", class_="sr-only", string="Instruction Mode:")
    if tag is None:
        return None
    b = tag.find_next("b")
    return b.get_text(strip=True) if b else None
