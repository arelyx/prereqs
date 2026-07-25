"""Parse a Baskin SOE department calendar page into planned offerings.

Page shape (see README.md and docs/universities/ucsc/source-soe-schedule.md):
one <table> containing, in document order: division header rows
(th[colspan=4]), repeated quarter-header rows (th.soe-classes-schedule-th,
Fall Y / Winter Y+1 / Spring Y+1 / Summer Y+1), then per course a name row
(td.soe-classes-schedule-course-name) followed by exactly four section cells
(one per quarter, each an <ul> of sections).

The HTML is malformed — sections rows are "closed" with a literal `<tr>` —
so we parse leniently (html.parser) and walk the table's cells in document
order instead of trusting row nesting. Every structural assumption is an
expect() call: drift aborts the run (fail-fast contract).
"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

from common import codes
from common.guards import expect

# "Fall 2026", "Winter 2027 " (trailing space occurs upstream — tolerated)
QUARTER_HEADER_RE = re.compile(r"^(Fall|Winter|Spring|Summer) (20\d\d)\s*$")
# "/courses/CSE12/Fall26/01" — canonical code, term, section number
SECTION_HREF_RE = re.compile(
    r"^/courses/([A-Za-z0-9]+)/(Fall|Winter|Spring|Summer)(\d{2})/([0-9A-Za-z]+)$"
)
# "CSE12: Computer Systems and Assembly Language and Lab" (site shows codes unspaced)
COURSE_NAME_RE = re.compile(r"^([A-Za-z0-9]+):\s*(.+)$", re.DOTALL)
# "Heiner H Litz (hlitz)" — or the literal "Staff" (unassigned)
INSTRUCTOR_RE = re.compile(r"^(?P<name>.+?)\s+\((?P<cruzid>[A-Za-z][A-Za-z0-9]*)\)$")

QUARTER_ORDER = ("fall", "winter", "spring", "summer")
# UCSC pisa term-code math (docs/DATA_MODEL.md):
#   2000 + (year - 2000) * 10 + {winter: 0, spring: 2, summer: 4, fall: 8}
QUARTER_OFFSET = {"winter": 0, "spring": 2, "summer": 4, "fall": 8}


def term_code(year: int, quarter: str) -> str:
    """pisa term code for a calendar year + quarter: fall 2026 -> '2268'."""
    expect(quarter in QUARTER_OFFSET, "unknown quarter for term code", quarter=quarter)
    return str(2000 + (year - 2000) * 10 + QUARTER_OFFSET[quarter])


def _cell_class(cell) -> list[str]:
    return cell.get("class") or []


def _parse_quarter_headers(dept: str, header_cells) -> list[dict]:
    """Validate all quarter-header groups and return the 4 terms in order.

    The header row repeats before each division; every group must spell the
    same single academic year: Fall Y, Winter/Spring/Summer Y+1.
    """
    expect(header_cells, "no th.soe-classes-schedule-th quarter headers found", dept=dept)
    expect(
        len(header_cells) % 4 == 0,
        "quarter header count not a multiple of 4",
        dept=dept, count=len(header_cells),
    )
    parsed = []
    for th in header_cells:
        text = th.get_text()
        m = QUARTER_HEADER_RE.match(text.strip())  # 'Winter 2027 ' has a trailing space
        expect(m is not None, "quarter header does not match 'Quarter YYYY'", dept=dept, text=text)
        parsed.append({"quarter": m.group(1).lower(), "year": int(m.group(2))})
    first = parsed[:4]
    quarters = tuple(t["quarter"] for t in first)
    expect(
        quarters == QUARTER_ORDER,
        "quarter headers out of expected Fall/Winter/Spring/Summer order",
        dept=dept, quarters=quarters,
    )
    fall_year = first[0]["year"]
    for t in first[1:]:
        expect(
            t["year"] == fall_year + 1,
            "quarter headers do not span one academic year",
            dept=dept, headers=first,
        )
    for i in range(4, len(parsed), 4):
        expect(
            parsed[i:i + 4] == first,
            "repeated quarter-header group differs from the first",
            dept=dept, group=parsed[i:i + 4], first=first,
        )
    academic_year = f"{fall_year}-{(fall_year + 1) % 100:02d}"
    return [
        {
            "academic_year": academic_year,
            "quarter": t["quarter"],
            "year": t["year"],
            "term_code": term_code(t["year"], t["quarter"]),
        }
        for t in first
    ]


def _parse_course_name_cell(dept: str, cell) -> dict:
    a = cell.find("a")
    expect(a is not None and a.has_attr("href"), "course-name cell lacks a link", dept=dept)
    text = " ".join(a.get_text().split())
    m = COURSE_NAME_RE.match(text)
    expect(m is not None, "course-name text does not match 'CODE: Title'", dept=dept, text=text)
    code = codes.normalize(m.group(1))
    expect(codes.is_course_id(code), "course code fails code regex", dept=dept, code=code, text=text)
    return {
        "course_code": code,
        "display_code": codes.display(code),
        "title": m.group(2).strip(),
        "href": a["href"],  # harvested, never constructed (HTTP-500 casing hazard)
    }


def _parse_instructors(dept: str, li, link_text: str) -> list[dict]:
    """Instructor lines are the li's text outside the <a> and <i> elements."""
    lines = []
    for s in li.find_all(string=True):
        if s.find_parent("a") is not None or s.find_parent("i") is not None:
            continue
        line = " ".join(s.split())
        if line:
            lines.append(line)
    expect(lines, "section has no instructor line (not even 'Staff')", dept=dept, section=link_text)
    instructors = []
    for line in lines:
        if line == "Staff":  # unassigned-yet semantics, not a person
            instructors.append({"name": "Staff"})
            continue
        m = INSTRUCTOR_RE.match(line)
        expect(
            m is not None,
            "instructor line matches neither 'Staff' nor 'Name (cruzid)'",
            dept=dept, line=line,
        )
        instructors.append({"name": m.group("name"), "cruzid": m.group("cruzid").lower()})
    return instructors


def _parse_section_cell(dept: str, course: dict, term: dict, cell) -> list[dict]:
    offerings = []
    for li in cell.find_all("li"):
        a = li.find("a")
        expect(a is not None and a.has_attr("href"), "section <li> lacks a link", dept=dept,
               course=course["course_code"])
        href = a["href"]
        m = SECTION_HREF_RE.match(href)
        expect(
            m is not None,
            "section href does not match /courses/{CODE}/{Quarter}{yy}/{nn}",
            dept=dept, href=href,
        )
        href_code, href_quarter, href_yy, section = m.groups()
        expect(
            codes.normalize(href_code) == course["course_code"],
            "section href code disagrees with course row",
            dept=dept, href=href, course=course["course_code"],
        )
        expect(
            href_quarter.lower() == term["quarter"] and int(href_yy) == term["year"] % 100,
            "section href term disagrees with its column header",
            dept=dept, href=href, column=f"{term['quarter']} {term['year']}",
        )
        note_tag = li.find("i")
        note = note_tag.get_text(strip=True) if note_tag else ""
        offerings.append({
            "dept": dept,
            "course_code": course["course_code"],
            "display_code": course["display_code"],
            "title": course["title"],
            "term": {
                "academic_year": term["academic_year"],
                "quarter": term["quarter"],
                "term_code": term["term_code"],
            },
            "section": section,
            "instructors": _parse_instructors(dept, li, " ".join(a.get_text().split())),
            "modality_note": note or None,
        })
    return offerings


def parse_department(dept: str, html: str) -> dict:
    """Parse one department calendar page.

    Returns {"dept", "academic_year", "courses": [...], "offerings": [...]}.
    `courses` lists every course row (including ones with zero planned
    sections); `offerings` has one record per section per quarter.
    """
    soup = BeautifulSoup(html, "html.parser")  # lenient: rows end with literal <tr>
    tables = soup.find_all("table")
    expect(len(tables) == 1, "department page must contain exactly one table",
           dept=dept, tables=len(tables))
    table = tables[0]

    cells = table.find_all(["td", "th"])
    terms = _parse_quarter_headers(
        dept, [c for c in cells if c.name == "th" and "soe-classes-schedule-th" in _cell_class(c)]
    )

    courses: list[dict] = []
    offerings: list[dict] = []
    current: dict | None = None
    section_cells_seen = 0

    def close_course():
        expect(
            current is None or section_cells_seen == 4,
            "course row not followed by exactly 4 quarter cells",
            dept=dept,
            course=current and current["course_code"],
            cells=section_cells_seen,
        )

    division = None
    for cell in cells:
        if cell.name == "th":
            if "soe-classes-schedule-th" in _cell_class(cell):
                continue  # quarter header, already validated
            # division header row (Lower Division / Upper Division / Graduate)
            close_course()
            current, section_cells_seen = None, 0
            division = cell.get_text(strip=True).lower().replace(" division", "")
        elif "soe-classes-schedule-course-name" in _cell_class(cell):
            close_course()
            current = {**_parse_course_name_cell(dept, cell), "division": division, "dept": dept}
            section_cells_seen = 0
            courses.append(current)
        else:
            expect(current is not None, "section cell appeared before any course row", dept=dept)
            expect(section_cells_seen < 4, "more than 4 quarter cells for one course",
                   dept=dept, course=current["course_code"])
            offerings.extend(_parse_section_cell(dept, current, terms[section_cells_seen], cell))
            section_cells_seen += 1
    close_course()

    expect(courses, "department page yielded zero courses", dept=dept)
    return {
        "dept": dept,
        "academic_year": terms[0]["academic_year"],
        "courses": courses,
        "offerings": offerings,
    }
