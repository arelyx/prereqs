"""Unit tests for the SOE planned-schedule parser.

The fixture is a real /courses/cse page (fetched 2026-07-25) trimmed to five
courses, keeping the site's quirks verbatim: malformed `<tr>` row
terminators, the trailing space in 'Winter 2027 ', a Staff instructor, a
multi-section course with a modality note, a two-instructor section, and a
course listed with zero planned sections.
"""

from pathlib import Path

import pytest

from common.guards import ScrapeDriftError
from ucsc.soe_schedule import parse

FIXTURE = Path(__file__).parent / "fixtures" / "cse_trimmed.html"


@pytest.fixture(scope="module")
def result():
    return parse.parse_department("cse", FIXTURE.read_text())


def test_term_code_math():
    assert parse.term_code(2026, "fall") == "2268"
    assert parse.term_code(2027, "winter") == "2270"
    assert parse.term_code(2027, "spring") == "2272"
    assert parse.term_code(2027, "summer") == "2274"
    # sanity outside the fixture year
    assert parse.term_code(2024, "fall") == "2248"
    with pytest.raises(ScrapeDriftError):
        parse.term_code(2026, "autumn")


def test_academic_year_and_courses(result):
    assert result["dept"] == "cse"
    assert result["academic_year"] == "2026-27"
    assert [c["course_code"] for c in result["courses"]] == [
        "CSE3", "CSE5J", "CSE12", "CSE100", "CSE280S",
    ]
    by_code = {c["course_code"]: c for c in result["courses"]}
    assert by_code["CSE12"]["display_code"] == "CSE 12"
    assert by_code["CSE12"]["title"] == "Computer Systems and Assembly Language and Lab"
    assert by_code["CSE12"]["division"] == "lower"
    assert by_code["CSE100"]["division"] == "upper"
    assert by_code["CSE280S"]["division"] == "graduate"
    # hrefs are harvested from the page, never constructed (casing hazard)
    assert by_code["CSE280S"]["href"] == "/courses/cse280s"


def test_offering_counts(result):
    # CSE3: 2, CSE5J: 0, CSE12: 6, CSE100: 3, CSE280S: 1
    assert len(result["offerings"]) == 12
    per_course = {}
    for o in result["offerings"]:
        per_course[o["course_code"]] = per_course.get(o["course_code"], 0) + 1
    assert per_course == {"CSE3": 2, "CSE12": 6, "CSE100": 3, "CSE280S": 1}


def test_multi_section_course_with_modality_note(result):
    cse12_fall = [
        o for o in result["offerings"]
        if o["course_code"] == "CSE12" and o["term"]["quarter"] == "fall"
    ]
    assert [o["section"] for o in cse12_fall] == ["01", "02"]
    assert cse12_fall[0]["term"] == {
        "academic_year": "2026-27", "quarter": "fall", "term_code": "2268",
    }
    assert cse12_fall[0]["instructors"] == [{"name": "Heiner H Litz", "cruzid": "hlitz"}]
    assert cse12_fall[0]["modality_note"] is None
    assert cse12_fall[1]["instructors"] == [{"name": "Marcelo Siero", "cruzid": "msiero2"}]
    assert cse12_fall[1]["modality_note"] == "Synchronous Online"
    cse12_winter = [
        o for o in result["offerings"]
        if o["course_code"] == "CSE12" and o["term"]["quarter"] == "winter"
    ]
    assert cse12_winter[0]["term"]["term_code"] == "2270"


def test_staff_instructor(result):
    cse100 = {o["term"]["quarter"]: o for o in result["offerings"] if o["course_code"] == "CSE100"}
    assert cse100["fall"]["instructors"] == [{"name": "Staff"}]
    assert cse100["winter"]["instructors"] == [
        {"name": "Dustin Alexander Richmond", "cruzid": "durichmo"}
    ]


def test_two_instructors_on_one_section(result):
    (o,) = [o for o in result["offerings"] if o["course_code"] == "CSE280S"]
    assert o["term"]["quarter"] == "fall"
    assert o["instructors"] == [
        {"name": "Heiner H Litz", "cruzid": "hlitz"},
        {"name": "Abel Souza", "cruzid": "absouza"},
    ]


def test_drift_missing_quarter_headers():
    html = FIXTURE.read_text().replace('class="soe-classes-schedule-th"', "")
    with pytest.raises(ScrapeDriftError, match="quarter headers"):
        parse.parse_department("cse", html)


def test_drift_bad_section_href():
    html = FIXTURE.read_text().replace(
        "/courses/CSE12/Fall26/01", "/courses/CSE12?term=Fall26"
    )
    with pytest.raises(ScrapeDriftError, match="section href"):
        parse.parse_department("cse", html)


def test_drift_href_term_disagrees_with_column():
    html = FIXTURE.read_text().replace(
        "/courses/CSE12/Fall26/02", "/courses/CSE12/Winter27/02"
    )
    with pytest.raises(ScrapeDriftError, match="disagrees with its column"):
        parse.parse_department("cse", html)


def test_drift_bad_course_code():
    html = FIXTURE.read_text().replace("CSE280S: Seminar", "SEMINAR: Seminar")
    with pytest.raises(ScrapeDriftError, match="code"):
        parse.parse_department("cse", html)


def test_drift_headers_span_two_academic_years():
    html = FIXTURE.read_text().replace("Summer 2027", "Summer 2028")
    with pytest.raises(ScrapeDriftError, match="academic year"):
        parse.parse_department("cse", html)


def test_drift_bad_instructor_line():
    html = FIXTURE.read_text().replace("Gerald B Moulds (gmoulds)", "TBA - see department")
    with pytest.raises(ScrapeDriftError, match="instructor line"):
        parse.parse_department("cse", html)
