"""parse.py against a trimmed real page (see fixtures/results_2262_trimmed.html).

The fixture is 10 verbatim rowpanels cut from the live Spring 2026 results
page (fetched 2026-07-25) with the count line rewritten to match — small
enough to commit, real enough to catch selector drift in the parser itself.
"""

from pathlib import Path

import pytest

from common import codes
from common.guards import ScrapeDriftError
from ucsc.pisa_offerings import parse

FIXTURE = Path(__file__).parent / "fixtures" / "results_2262_trimmed.html"


@pytest.fixture(scope="module")
def fixture_html() -> str:
    return FIXTURE.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def rows(fixture_html) -> list[dict]:
    return parse.parse_results(fixture_html, "2262")


def by_class_number(rows, nbr):
    (row,) = [r for r in rows if r["class_number"] == nbr]
    return row


def test_row_count_matches_count_line(rows):
    assert len(rows) == 10


def test_plain_row_all_fields(rows):
    assert by_class_number(rows, "51513") == {
        "term_code": "2262",
        "course_code": "AM11A",
        "display_code": "AM 11A",
        "section": "01",
        "class_number": "51513",
        "title": "Math Methd for Econ",
        "instructors": [{"name": "Simons,J."}],
        "days_times": "MWF 12:00PM-01:05PM",
        "location": "LEC: R Carson Acad 240",
        "modality": "In Person",
        "enrolled": 84,
        "capacity": 84,
        "status": "Closed",
    }


def test_multi_instructor_split_on_br(rows):
    row = by_class_number(rows, "50827")
    assert row["instructors"] == [{"name": "Jackson,J."}, {"name": "Karlic,K."}]
    # Sections can over-enroll a 0-capacity shell — parser must not "fix" it.
    assert (row["enrolled"], row["capacity"]) == (17, 0)


def test_staff_placeholder_and_cancelled_section(rows):
    row = by_class_number(rows, "50093")
    assert row["instructors"] == [{"name": "Staff"}]
    # Cancelled sections carry the literal doubled word and a bare location.
    assert row["days_times"] == "Cancelled Cancelled"
    assert row["location"] == "LEC"


def test_online_modalities_and_empty_day_time(rows):
    assert by_class_number(rows, "50001")["modality"] == "Asynchronous Online"
    assert by_class_number(rows, "50001")["days_times"] == ""
    assert by_class_number(rows, "52537")["modality"] == "Synchronous Online"
    assert by_class_number(rows, "52119")["modality"] == "Hybrid"


def test_every_row_passes_offering_invariants(rows):
    for row in rows:
        assert codes.is_course_id(row["course_code"])
        assert row["instructors"], row
        assert all(i["name"] for i in row["instructors"])
        assert row["enrolled"] >= 0 and row["capacity"] >= 0
        assert row["status"] in {"Open", "Closed", "Closed with Wait List"}


def test_zero_results_page_returns_empty():
    html = "<html><body><p>Sorry. Your search:<br>found no results</p></body></html>"
    assert parse.parse_results(html, "2270") == []


def test_page_without_any_marker_is_drift():
    with pytest.raises(ScrapeDriftError, match="neither a count line"):
        parse.parse_results("<html><body>maintenance</body></html>", "2262")


def test_count_line_total_mismatch_is_drift(fixture_html):
    broken = fixture_html.replace(
        "<b>1</b> - <b>10</b> of <b>10</b>", "<b>1</b> - <b>11</b> of <b>11</b>"
    )
    with pytest.raises(ScrapeDriftError, match="rowpanel count"):
        parse.parse_results(broken, "2262")


def test_truncated_single_page_is_drift(fixture_html):
    # Count line says more rows exist than the page covered => rec_dur too low.
    broken = fixture_html.replace(
        "<b>1</b> - <b>10</b> of <b>10</b>", "<b>1</b> - <b>10</b> of <b>20</b>"
    )
    with pytest.raises(ScrapeDriftError, match="rec_dur"):
        parse.parse_results(broken, "2262")


def test_heading_shape_change_is_drift(fixture_html):
    # Collapse the triple-nbsp code/title separator in one heading.
    broken = fixture_html.replace("\xa0\xa0\xa0", " ", 1)
    with pytest.raises(ScrapeDriftError, match="triple-nbsp"):
        parse.parse_results(broken, "2262")


def test_missing_instructor_is_drift(fixture_html):
    broken = fixture_html.replace("Instructor:</i> Simons,J.", "Instructor:</i> ")
    with pytest.raises(ScrapeDriftError, match="instructor"):
        parse.parse_results(broken, "2262")
