"""Deterministic segmentation of UCSC program (major/minor) requirement pages.

Turns a SmartCatalog IQ program page into a tree of *raw rule nodes* — heading
text, prose, notes, course rows, and option branches — WITHOUT interpreting
combinators. Interpretation (all_of vs one_of vs n_of, counts) happens in
structure.py, deterministically where the heading vocabulary is unambiguous
and via the small LLM otherwise. Research/hazard basis:
docs/universities/ucsc/source-major-requirements.md.

Key hazards handled here:
- Rule-group headings are identified by sc-RequiredCoursesHeading* CLASS and
  document order, never by absolute h-level (levels shift majors vs minors).
- Narrative pseudo-rows (href into narrative-courses/*) partition a table into
  OR branches; an unknown narrative slug hard-fails (it changes semantics).
- The Planners section duplicates every course and must be dropped.
- Qualification/screening sections use the same markup as degree requirements
  and must stay segregated (section kind), not merged.
- Empty <table></table> spam is filtered; sc-crosslisted divs inside course
  cells are stripped.
- Literature-style pages clone full requirement sections per concentration at
  the h2 level.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from bs4 import BeautifulSoup, Tag

from common.guards import expect
from common import codes

HEADING_CLASS_RE = re.compile(r"sc-RequiredCoursesHeading([1-4])")
# Observed live: the research sample had the first three; the full-catalog run
# surfaced 'either-this-course' (singular starter) on ~12 programs
# (Agroecology, Anthropology, Applied Math/Physics, BMB, ...). All four share
# the same semantics: start a new OR-branch. A NEW slug still hard-fails.
KNOWN_NARRATIVE_SLUGS = {
    "either-these-courses",
    "either-this-course",
    "or-these-courses",
    "or-this-course",
    "one-of-these-courses",
    "either-one-of-these-courses",
    "and",
    "or",
}

# Narrative grammar (semantics verified against Biology B.A. / BMEB pages):
#   either-these-courses / either-this-course  -> open OR-block, first branch
#                                                 (rows in a branch are a
#                                                 package: ALL required)
#   or-these-courses / or-this-course / or     -> next branch; if no block is
#                                                 open, the PREVIOUS required
#                                                 row becomes the first branch
#                                                 ("STAT 5 / or STAT 7+7L")
#   one-of-these-courses /                     -> open OR-block in pick mode:
#     either-one-of-these-courses                 every row is its own branch
#   and                                        -> close the OR-block; following
#                                                 rows are plain requirements
BRANCH_OPENERS = {"either-these-courses", "either-this-course"}
BRANCH_CONTINUERS = {"or-these-courses", "or-this-course", "or"}
PICK_OPENERS = {"one-of-these-courses", "either-one-of-these-courses"}
BLOCK_CLOSERS = {"and"}
COURSE_CODE_TEXT_RE = re.compile(r"^[A-Z]{2,5} \d{1,3}[A-Z]{0,2}$")

# h2/h3 titles that delimit the requirements zone vs policies/planners.
PLANNER_TITLE_RE = re.compile(r"planner", re.IGNORECASE)
QUALIFICATION_TITLE_RE = re.compile(
    r"qualification|declaration|screening|transfer", re.IGNORECASE
)


@dataclass
class RawRule:
    heading: str
    heading_class: int  # 1-4 from sc-RequiredCoursesHeading{n}
    prose: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    courses: list[dict] = field(default_factory=list)  # {code, title, credits, href}
    branches: list[list[dict]] = field(default_factory=list)  # OR-of-AND course rows
    branch_labels: list[str] = field(default_factory=list)


@dataclass
class RawSection:
    kind: str  # course_requirements | qualification | concentration_container
    title: str
    concentration: str | None
    rules: list[RawRule] = field(default_factory=list)


@dataclass
class SegmentedProgram:
    name: str
    url: str
    sections: list[RawSection] = field(default_factory=list)
    hazards: list[str] = field(default_factory=list)


def segment_program(html: str, name: str, url: str) -> SegmentedProgram:
    soup = BeautifulSoup(html, "html.parser")
    prog = SegmentedProgram(name=name, url=url)

    h1 = soup.find("h1")
    expect(h1 is not None, "program page has no h1", url=url)

    main = h1.parent
    headings = main.find_all(re.compile(r"^h[1-6]$"))
    expect(len(headings) > 3, "program page has too few headings", url=url)

    # Walk headings in document order, tracking the current top-level (h2)
    # context and the current requirement section.
    current_section: RawSection | None = None
    current_rule: RawRule | None = None
    current_h2 = ""
    in_planners = False

    for el in main.descendants:
        if not isinstance(el, Tag):
            continue
        if el.name == "h2":
            current_h2 = el.get_text(" ", strip=True)
            in_planners = False
            current_rule = None
            current_section = None
            continue
        if el.name in ("h3", "h4", "h5", "h6"):
            title = el.get_text(" ", strip=True)
            cls = " ".join(el.get("class") or [])
            m = HEADING_CLASS_RE.search(cls)
            if PLANNER_TITLE_RE.search(title):
                in_planners = True
                current_rule = None
                continue
            if m:
                in_planners = False
                level = int(m.group(1))
                if level == 1:
                    current_section = _new_section(prog, title, current_h2)
                    current_rule = None
                else:
                    if current_section is None:
                        current_section = _new_section(prog, title, current_h2)
                    current_rule = RawRule(heading=title, heading_class=level)
                    current_section.rules.append(current_rule)
                continue
            # Non-classed heading inside a section: prose context boundary.
            continue

        if in_planners or current_section is None:
            continue

        if el.name == "table":
            rows = el.find_all("tr")
            if not rows:
                continue  # empty-table spam
            if current_rule is None:
                # Table directly under a section heading (common for
                # qualification blocks): synthesize a rule from the section.
                current_rule = RawRule(heading=current_section.title, heading_class=2)
                current_section.rules.append(current_rule)
            _parse_course_table(el, current_rule, prog)
        elif el.name == "div" and "sc-requirementsNote" in (el.get("class") or []):
            if current_rule is not None:
                current_rule.notes.append(el.get_text(" ", strip=True))
        elif el.name == "p":
            if el.find_parent("table"):
                continue
            text = el.get_text(" ", strip=True)
            if text and current_rule is not None:
                current_rule.prose.append(text)

    prog.sections = [s for s in prog.sections if s.rules]
    expect(bool(prog.sections), "no requirement sections found", url=url)
    return prog


def _new_section(prog: SegmentedProgram, title: str, h2_context: str) -> RawSection:
    combined = f"{h2_context} / {title}"
    if QUALIFICATION_TITLE_RE.search(combined):
        kind = "qualification"
    else:
        kind = "course_requirements"
    # Literature-style: concentration name lives in the h2 itself.
    concentration = None
    if "concentration" in h2_context.lower():
        concentration = h2_context
    section = RawSection(kind=kind, title=title, concentration=concentration)
    prog.sections.append(section)
    return section


def _parse_course_table(table: Tag, rule: RawRule, prog: SegmentedProgram) -> None:
    """Extract course rows via the narrative-marker state machine.

    Emits into the rule: plain requirements into rule.courses, each OR-block's
    branches into rule.branches. Pick-mode blocks put every row in its own
    branch. An 'or' marker with no open block converts the previous required
    row into the first branch of a new block.
    """
    mode: str | None = None  # None (required) | 'package' | 'pick'
    branch: list[dict] | None = None

    def open_block(first_branch: list[dict], label: str, new_mode: str) -> list[dict]:
        rule.branches.append(first_branch)
        rule.branch_labels.append(label)
        nonlocal mode
        mode = new_mode
        return first_branch

    for tr in table.find_all("tr"):
        num_cell = tr.find("td", class_="sc-coursenumber")
        if num_cell is None:
            continue
        link = num_cell.find("a", class_="sc-courselink")
        href = link.get("href", "") if link else ""

        if "narrative-courses/" in href:
            slug = href.rstrip("/").split("/")[-1]
            expect(
                slug in KNOWN_NARRATIVE_SLUGS,
                "unknown narrative-courses slug (OR semantics changed)",
                slug=slug,
                program=prog.name,
            )
            title_cell = tr.find("td", class_="sc-coursetitle")
            label = title_cell.get_text(" ", strip=True) if title_cell else slug

            if slug in BLOCK_CLOSERS:
                mode, branch = None, None
            elif slug in BRANCH_OPENERS:
                branch = open_block([], label, "package")
            elif slug in PICK_OPENERS:
                # No branch is pre-created: every following row makes its own.
                mode, branch = "pick", None
            elif slug in BRANCH_CONTINUERS:
                if mode is None:
                    # "STAT 5 / or STAT 7 + 7L": previous required row is
                    # retroactively the first branch of a new block.
                    expect(
                        bool(rule.courses),
                        "or-marker with no open block and no prior course row",
                        program=prog.name,
                        heading=rule.heading,
                    )
                    open_block([rule.courses.pop()], label, "package")
                # A continuer's rows are a package branch even inside a
                # pick-mode block ("One of these: A, B; or these courses: C, D"
                # = pick(A|B) or package(C+D)).
                mode = "package"
                branch = []
                rule.branches.append(branch)
                rule.branch_labels.append(label)
            continue

        for xl in num_cell.find_all(class_="sc-crosslisted"):
            xl.extract()  # '/CSE 185S' riders corrupt the code text
        code_text = num_cell.get_text(" ", strip=True)
        if not code_text:
            continue
        expect(
            COURSE_CODE_TEXT_RE.match(code_text) is not None,
            "course code in requirements table has unexpected shape",
            code=code_text,
            program=prog.name,
        )
        title_cell = tr.find("td", class_="sc-coursetitle")
        credits_el = tr.find(class_="credits")
        row = {
            "code": codes.normalize(code_text),
            "display_code": code_text,
            "title": title_cell.get_text(" ", strip=True) if title_cell else "",
            "credits": credits_el.get_text(strip=True) if credits_el else "",
            "href": href,
        }
        if mode == "pick":
            rule.branches.append([row])  # every row its own single-course branch
            rule.branch_labels.append("")
        elif mode == "package" and branch is not None:
            branch.append(row)
        else:
            rule.courses.append(row)
