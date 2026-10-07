from pathlib import Path

import pytest

from common.guards import ScrapeDriftError
from ucsc.catalog_courses import parse

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


def test_identical_duplicate_blocks_deduped():
    # CMS emits some course blocks twice, byte-identical (MATH 24 in 2026-27).
    start = FIXTURE.find('<h2 class="course-name"')
    second = FIXTURE.find('<h2 class="course-name"', start + 10)
    third = FIXTURE.find('<h2 class="course-name"', second + 10)
    html = FIXTURE[:third] + FIXTURE[second:third] + FIXTURE[third:]  # dup CSE101 block
    d = parse.parse_department(html, "cse", "CSE", "url")
    assert [c["code"] for c in d.courses] == ["CSE3", "CSE101", "CSE185E", "CSE293"]
    assert d.duplicate_codes == ["CSE101"]


def test_differing_duplicate_blocks_abort():
    start = FIXTURE.find('<h2 class="course-name"')
    second = FIXTURE.find('<h2 class="course-name"', start + 10)
    third = FIXTURE.find('<h2 class="course-name"', second + 10)
    altered = FIXTURE[second:third].replace("Introduction to Data Structures", "Changed Title")
    html = FIXTURE[:third] + altered + FIXTURE[third:]
    with pytest.raises(ScrapeDriftError, match="differing content"):
        parse.parse_department(html, "cse", "CSE", "url")


def test_unknown_class_detection():
    html = FIXTURE.replace('class="genEd"', 'class="brandNewThing"', 1)
    d = parse.parse_department(html, "cse", "CSE", "url")
    assert "brandNewThing" in d.unknown_classes


def test_division_from_number_fallback():
    from ucsc.catalog_courses.parse import division_from_number

    assert division_from_number("1") == "lower"
    assert division_from_number("99L") == "lower"
    assert division_from_number("100") == "upper"
    assert division_from_number("194F") == "upper"
    assert division_from_number("200") == "graduate"
    assert division_from_number("") == ""
