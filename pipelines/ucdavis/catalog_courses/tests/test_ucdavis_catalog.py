from pathlib import Path

import pytest

from common.guards import ScrapeDriftError
from ucdavis.catalog_courses import fetch

FIXTURE = (Path(__file__).parent / "fixture_ecs_trimmed.html").read_text()


@pytest.fixture(scope="module")
def parsed():
    courses, unknown_labels = fetch.parse_subject(FIXTURE, "ecs", min_courses=1)
    return {c["display_code"]: c for c in courses}, unknown_labels


def test_codes_and_headers(parsed):
    courses, unknown_labels = parsed
    assert set(courses) == {"ECS 011", "ECS 017", "ECS 036A", "ECS 012"}
    assert unknown_labels == set()
    c = courses["ECS 011"]
    assert c["code"] == "ECS011"
    assert c["title"] == "Artificial Intelligence for All"  # em-dash prefix stripped
    assert c["credits"] == "4"


def test_ge_codes_from_label(parsed):
    courses, _ = parsed
    assert courses["ECS 011"]["ge_codes"] == ["SE", "SL"]
    assert courses["ECS 017"]["ge_codes"] == ["SE", "QL"]


def test_prereq_prose_extracted_without_label(parsed):
    courses, _ = parsed
    p = courses["ECS 017"]["raw_prerequisites"]
    assert p.startswith("MAT 016A (can be concurrent) or MAT 017A")
    assert "Prerequisite(s)" not in p
    assert courses["ECS 011"]["raw_prerequisites"] is None


def test_superseded_version_flagged_and_old_prereq_kept(parsed):
    # ECS 036A carries an appended updated version; prototype keeps the
    # top-level (old) fields but flags the block for a future full parser.
    courses, _ = parsed
    c = courses["ECS 036A"]
    assert c["has_updated_version"] is True
    assert "This version has ended" not in c["description"]
    assert c["raw_prerequisites"].startswith("ECS 032A C- or better")


def test_cross_listing_and_extras(parsed):
    courses, _ = parsed
    assert courses["ECS 012"]["cross_listed"] == "CDM 012"
    assert courses["ECS 011"]["extra_fields"]["Grade Mode:"] == "Letter."


def test_min_course_guard_fires():
    with pytest.raises(ScrapeDriftError):
        fetch.parse_subject(FIXTURE, "ecs")  # default threshold of 30


def test_unknown_label_surfaces():
    html = FIXTURE.replace("<em>Grade Mode:</em>", "<em>Brand New Field:</em>", 1)
    _, unknown = fetch.parse_subject(html, "ecs", min_courses=1)
    assert "Brand New Field:" in unknown
