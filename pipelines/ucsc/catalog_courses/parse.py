"""Deterministic parsing of UCSC catalog department course pages.

Everything here is non-LLM extraction. Field inventory, selector rationale,
and hazards: docs/universities/ucsc/source-catalog-courses.md. The critical
lessons from the POC encoded here:

- Walk ALL sibling tags of each h2.course-name (the POC walked only divs and
  silently dropped GE codes, quarter-offered, instructor, and the bare
  h4.crosslisted/p.sc-crosslisted pair).
- Exclude the div.cross-listed tail at the bottom of each page (full duplicate
  blocks of courses managed by other departments — the POC double-counted).
- Unknown block-level classes hard-fail the run: silent dropping of unknown
  divs is exactly how data got lost before.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from bs4 import BeautifulSoup, Tag

from common.guards import expect
from common import codes

# Block-level classes we understand. A new class on the page = schema drift.
KNOWN_BLOCK_CLASSES = {
    "desc",
    "sc-credithours",
    "instructor",
    "genEd",
    "quarter",
    "extraFields",
    "crosslisted",  # bare h4 preceding p.sc-crosslisted
    "sc-crosslisted",
    "cross-listed",  # tail container of other-department duplicates
    "course-name",
}

# extraFields h4 labels we map to typed fields; anything else is kept
# generically and surfaced in the manifest so drift announces itself.
KNOWN_EXTRA_LABELS = {"Requirements", "Repeatable for credit", "Quarter offered"}

FORMERLY_RE = re.compile(r"\((Formerly[^)]*)\)")
COURSE_HEADER_RE = re.compile(r"^[A-Z]{1,5} \d{1,3}[A-Z]{0,2}$")


@dataclass
class ParsedDept:
    slug: str
    name: str
    url: str
    courses: list[dict] = field(default_factory=list)
    cross_listed_tail: list[str] = field(default_factory=list)  # display codes
    unknown_classes: set = field(default_factory=set)
    unknown_extra_labels: set = field(default_factory=set)


def discover_departments(root_html: str, base_url: str) -> list[dict]:
    """Department links from the courses root page (#navLocal)."""
    soup = BeautifulSoup(root_html, "html.parser")
    nav = soup.select_one("#navLocal")
    expect(nav is not None, "courses root: #navLocal nav missing")
    links = []
    for a in nav.select("li.hasChildren > a[href]"):
        href = a["href"]
        # Archived editions use /en/<year>/ instead of /en/current/ — match on
        # the stable path segment, and skip the root link itself.
        if "/general-catalog/courses/" in href and not href.rstrip("/").endswith("/courses"):
            links.append(
                {
                    "slug": href.rstrip("/").split("/")[-1],
                    "name": a.get_text(strip=True),
                    "url": base_url + href if href.startswith("/") else href,
                }
            )
    expect(
        80 <= len(links) <= 100,
        "department link count outside expected range",
        count=len(links),
    )
    return links


def catalog_year(html: str) -> str:
    """Edition string from the breadcrumb, e.g. '2026-2027'."""
    m = re.search(r"(\d{4}-\d{4}) UCSC General Catalog", html)
    expect(m is not None, "catalog edition breadcrumb not found")
    return m.group(1).split(" ")[0]


def parse_department(html: str, slug: str, name: str, url: str) -> ParsedDept:
    soup = BeautifulSoup(html, "html.parser")
    dept = ParsedDept(slug=slug, name=name, url=url)

    headers = soup.select("h2.course-name")
    for h2 in headers:
        if h2.find_parent(class_="cross-listed"):
            # Tail duplicate managed by another department: record, don't parse.
            span = h2.select_one("a span")
            if span:
                dept.cross_listed_tail.append(span.get_text(strip=True))
            continue
        course = _parse_course_block(h2, dept)
        if course:
            dept.courses.append(course)
    return dept


def _parse_course_block(h2: Tag, dept: ParsedDept) -> dict | None:
    anchor = h2.select_one("a[href]")
    span = anchor.select_one("span") if anchor else None
    expect(
        anchor is not None and span is not None,
        "course header missing anchor/span",
        dept=dept.slug,
    )
    display_code = span.get_text(strip=True)
    expect(
        COURSE_HEADER_RE.match(display_code) is not None,
        "course code has unexpected shape",
        dept=dept.slug,
        code=display_code,
    )
    title = anchor.get_text(" ", strip=True)
    if title.startswith(display_code):
        title = title[len(display_code):].strip()

    href = anchor["href"]
    path_parts = href.strip("/").split("/")
    division = next(
        (p for p in path_parts if p in ("lower-division", "upper-division", "graduate")),
        "",
    ).replace("-division", "")

    code = codes.normalize(display_code)
    subject, number = re.match(r"^([A-Z]+)\s*(.+)$", display_code).groups()

    course: dict = {
        "code": code,
        "display_code": display_code,
        "subject": subject,
        "number": number.replace(" ", ""),
        "title": title,
        "division": division,
        "url": href,
        "description": "",
        "credits": "",
        "ge_codes": [],
        "quarters_offered_text": None,
        "catalog_instructor": None,
        "cross_listed": [],
        "formerly": None,
        "repeatable": False,
        "raw_requirements": None,
        "extra_fields": {},
    }

    pending_crosslist_header = False
    for sib in h2.next_siblings:
        if not isinstance(sib, Tag):
            continue
        sib_classes = set(sib.get("class") or [])
        if "course-name" in sib_classes or "cross-listed" in sib_classes:
            break  # next course, or the tail duplicates section

        unknown = sib_classes - KNOWN_BLOCK_CLASSES
        if unknown:
            dept.unknown_classes.update(unknown)
            continue

        if "desc" in sib_classes:
            text = sib.get_text(" ", strip=True)
            if text and not course["description"]:
                course["description"] = text
        elif "sc-credithours" in sib_classes:
            credits = sib.select_one(".credits")
            course["credits"] = credits.get_text(strip=True) if credits else ""
        elif "instructor" in sib_classes:
            p = sib.find("p")
            text = p.get_text(strip=True) if p else ""
            # Unstaffed courses render as runs of commas/spaces ("  ,  ,  ").
            course["catalog_instructor"] = text if re.search(r"[A-Za-z]", text) else None
        elif "genEd" in sib_classes:
            p = sib.find("p")
            if p:
                course["ge_codes"] = [
                    g.strip() for g in p.get_text(strip=True).split(",") if g.strip()
                ]
        elif "quarter" in sib_classes:
            p = sib.find("p")
            course["quarters_offered_text"] = p.get_text(strip=True) if p else None
        elif "crosslisted" in sib_classes and sib.name == "h4":
            pending_crosslist_header = True
        elif "sc-crosslisted" in sib_classes:
            course["cross_listed"].extend(
                codes.normalize(c) for c in sib.get_text(strip=True).split(",") if c.strip()
            )
            pending_crosslist_header = False
        elif "extraFields" in sib_classes:
            _parse_extra_fields(sib, course, dept)

    if pending_crosslist_header and not course["cross_listed"]:
        # A crosslisted header with no following code list — flag as drift-ish.
        dept.unknown_classes.add("crosslisted-header-without-codes")

    m = FORMERLY_RE.search(course["description"])
    if m:
        course["formerly"] = m.group(1)
    return course


def _parse_extra_fields(container: Tag, course: dict, dept: ParsedDept) -> None:
    """extraFields is a run of h4 labels each followed by prose until the next h4.

    Walk direct children only: a descendants walk double-counts text inside
    sc-courselink anchors (once for the Tag, once for its inner string),
    producing 'CSE 12 CSE 12 or ...'.
    """
    current_label: str | None = None
    chunks: dict[str, list[str]] = {}
    for child in container.children:
        if isinstance(child, Tag) and child.name == "h4":
            current_label = child.get_text(strip=True)
            chunks.setdefault(current_label, [])
        elif current_label is not None:
            text = (
                child.get_text(" ", strip=True)
                if isinstance(child, Tag)
                else str(child).strip()
            )
            if text:
                chunks[current_label].append(re.sub(r"\s+", " ", text))

    for label, parts in chunks.items():
        body = " ".join(parts).strip()
        if label == "Requirements":
            course["raw_requirements"] = body or None
        elif label == "Repeatable for credit":
            course["repeatable"] = body.lower().startswith("yes")
        elif label == "Quarter offered":
            course["quarters_offered_text"] = body or course["quarters_offered_text"]
        else:
            course["extra_fields"][label] = body
            if label not in KNOWN_EXTRA_LABELS:
                dept.unknown_extra_labels.add(label)
