from pathlib import Path

import pytest

from common.guards import ScrapeDriftError
from ucsc.catalog_courses import parse, prompts

FIXTURE = (Path(__file__).parent / "fixture_cse_trimmed.html").read_text()


@pytest.fixture(scope="module")
def dept():
    return parse.parse_department(FIXTURE, "cse", "CSE", "url")


def test_parses_own_courses_and_excludes_tail(dept):
    assert [c["code"] for c in dept.courses] == ["CSE3", "CSE101", "CSE185E", "CSE293"]
    # The div.cross-listed tail (ECE 253 block) is recorded, not parsed as CSE's.
    assert dept.cross_listed_tail == ["ECE 253"]
    assert dept.unknown_classes == set()


def test_ge_codes_and_fields(dept):
    cse3 = dept.courses[0]
    assert cse3["ge_codes"] == ["PE-T"]
    assert cse3["credits"] == "5"
    assert cse3["division"] == "lower"
    assert cse3["formerly"] is not None


def test_requirements_prose_not_duplicated(dept):
    cse101 = dept.courses[1]
    # Regression: a descendants-based walk once emitted 'CSE 12 CSE 12 or ...'
    assert "CSE 12 CSE 12" not in cse101["raw_requirements"]
    assert cse101["raw_requirements"].startswith("Prerequisite(s): CSE 12 or BME 160")
    assert cse101["catalog_instructor"] is None  # ',  ,  ,' garbage -> None


def test_inline_crosslisting(dept):
    cse185e = dept.courses[2]
    assert cse185e["cross_listed"] == ["CSE185S"]


def test_dept_discovery_from_fixture_nav():
    depts = parse.discover_departments(FIXTURE, "https://catalog.ucsc.edu")
    assert any(d["slug"] == "cse-computer-science-and-engineering" for d in depts)
    assert 80 <= len(depts) <= 100
    assert parse.catalog_year(FIXTURE).startswith("20")


def test_courselistheader_routes_to_extra_fields():
    # HAVC pattern: h3.courseListHeader 'Notes' + following desc div = note
    # content, not the course description.
    html = FIXTURE.replace(
        '<div class="sc-credithours">',
        '<h3 class="courseListHeader">Notes</h3>'
        '<div class="desc">A note about the course.</div>'
        '<div class="sc-credithours">',
        1,
    )
    d = parse.parse_department(html, "cse", "CSE", "url")
    cse3 = d.courses[0]
    assert cse3["extra_fields"].get("Notes") == "A note about the course."
    assert "A note about" not in cse3["description"]


def test_unknown_class_detection():
    html = FIXTURE.replace('class="genEd"', 'class="brandNewThing"', 1)
    d = parse.parse_department(html, "cse", "CSE", "url")
    assert "brandNewThing" in d.unknown_classes


def test_needs_llm_prefilter():
    assert not prompts.needs_llm(None)
    assert not prompts.needs_llm("Enrollment is restricted to seniors.")
    assert prompts.needs_llm("Prerequisite(s): CSE 12.")
    assert prompts.needs_llm("Phys 116A or Math 21 required.")  # title-case codes


def test_preprocess_strips_standalone_coreq_keeps_inline():
    s = "Prerequisite(s): CSE 150 . Concurrent enrollment in CSE 151L is required."
    assert "151L" not in prompts.preprocess(s)
    s2 = "Prerequisite(s): CSE 12 ; previous or concurrent enrollment in CSE 100L is required."
    assert "CSE 100L" in prompts.preprocess(s2)


def test_clean_groups_hallucination_guard():
    raw = "Prerequisite(s): CSE 12 or BME 160."
    parsed = {"groups": [["CSE12", "BME160", "CSE999"], ["MATH19A"]]}
    # CSE999 and MATH19A don't appear in the source text -> dropped entirely.
    assert prompts.clean_groups(parsed, raw) == [["CSE12", "BME160"]]
    assert prompts.clean_groups(None, raw) == []
    assert prompts.clean_groups({"groups": "nope"}, raw) == []
