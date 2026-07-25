from pathlib import Path

import pytest

from common.guards import ScrapeDriftError
from ucsd.catalog_courses import fetch

FIXTURE = (Path(__file__).parent / "fixture_cse_trimmed.html").read_text()
SEQ_FIXTURE = (Path(__file__).parent / "fixture_math_seq.html").read_text()


@pytest.fixture(scope="module")
def parsed():
    courses, subheads = fetch.parse_subject(FIXTURE, "CSE", min_courses=1)
    return {c["display_code"]: c for c in courses}, subheads


def test_name_line_parsing(parsed):
    courses, subheads = parsed
    assert set(courses) == {"CSE 3", "CSE 4GS", "CSE 105", "CSE 241A"}
    assert subheads == set()
    c = courses["CSE 3"]
    assert (c["code"], c["title"], c["credits"]) == ("CSE3", "Fluency in Information Technology", "4")
    assert c["division"] == "lower"
    assert c["anchor"] == "cse3"


def test_prereq_split_from_description(parsed):
    courses, _ = parsed
    c = courses["CSE 3"]
    assert c["raw_prerequisites"] == "none."
    assert "Prerequisites" not in c["description"]
    coreq = courses["CSE 4GS"]["raw_prerequisites"]
    assert coreq == "MATH 10A or MATH 20A; department approval, and corequisite of CSE 6GS."


def test_tag_annotation_stripped(parsed):
    courses, _ = parsed
    c = courses["CSE 105"]
    assert c["title"] == "Theory of Computability"
    assert c["division"] == "upper"


def test_cross_listed_slashed_codes(parsed):
    courses, _ = parsed
    c = courses["CSE 241A"]
    assert c["is_cross_listed"] is True
    assert c["all_codes"] == ["CSE241A", "ECE260B"]
    assert c["code"] == "CSE241A"  # primary = owning subject


def test_sequence_course_flagged():
    courses, _ = fetch.parse_subject(SEQ_FIXTURE, "MATH", min_courses=1)
    (c,) = courses
    assert c["is_sequence"] is True
    assert c["display_code"] == "MATH 220A-B-C"
    assert c["credits"] == "4-4-4"  # en-dash-free after normalization
    assert c["raw_prerequisites"] == "MATH 140A-B or consent of instructor."


def test_guards_fire():
    with pytest.raises(ScrapeDriftError):
        fetch.parse_subject(FIXTURE, "CSE")  # default min_courses=100
    with pytest.raises(ScrapeDriftError):
        # name/description pairing broken -> hard fail, not silent skip
        fetch.parse_subject(FIXTURE.replace('class="course-descriptions"', 'class="x"', 1),
                            "CSE", min_courses=1)
