from datetime import date

import pytest

from ucsc.pisa_offerings import terms


def test_parse_code_all_seasons():
    assert terms.parse_code("2260") == (2026, "winter")
    assert terms.parse_code("2262") == (2026, "spring")
    assert terms.parse_code("2264") == (2026, "summer")
    assert terms.parse_code("2268") == (2026, "fall")
    assert terms.parse_code("2048") == (2004, "fall")  # oldest term pisa has


@pytest.mark.parametrize("bad", ["", "226", "22620", "1262", "2261", "2263", "2265", "2269", "abcd"])
def test_parse_code_rejects_malformed(bad):
    with pytest.raises(ValueError):
        terms.parse_code(bad)


def test_code_for_roundtrip():
    for code in ["2048", "2088", "2148", "2260", "2262", "2264", "2268"]:
        year, season = terms.parse_code(code)
        assert terms.code_for(year, season) == code
    with pytest.raises(ValueError):
        terms.code_for(2026, "autumn")
    with pytest.raises(ValueError):
        terms.code_for(1999, "fall")


def test_sort_key_is_chronological():
    # Fall 2024 (2248) precedes Winter 2025 (2250) — the year rollover happens
    # between fall and winter, and the sparse digits keep int order correct.
    order = ["2248", "2250", "2252", "2254", "2258", "2260"]
    assert sorted(order, key=terms.sort_key) == order
    assert terms.sort_key("2248") < terms.sort_key("2250")


def test_academic_year_fall_starts_the_year():
    assert terms.academic_year("2268") == "2026-2027"  # Fall 2026 opens 26-27
    assert terms.academic_year("2260") == "2025-2026"  # Winter 2026 closes 25-26
    assert terms.academic_year("2262") == "2025-2026"
    assert terms.academic_year("2264") == "2025-2026"


def test_enumerate_codes_crosses_years_and_skips_gaps():
    # No season digit 6: 2254 (Summer 2025) is followed by 2258 (Fall 2025).
    assert terms.enumerate_codes("2248", "2262") == [
        "2248", "2250", "2252", "2254", "2258", "2260", "2262",
    ]
    assert terms.enumerate_codes("2262", "2262") == ["2262"]
    with pytest.raises(ValueError):
        terms.enumerate_codes("2262", "2248")
    with pytest.raises(ValueError):
        terms.enumerate_codes("2261", "2268")


def test_is_future_against_fixed_today():
    today = date(2026, 7, 25)
    assert terms.is_future("2268", today)          # Fall 2026 not started
    assert terms.is_future("2270", today)          # Winter 2027
    assert not terms.is_future("2264", today)      # Summer 2026 underway
    assert not terms.is_future("2262", today)      # Spring 2026 past
    # Boundary: a term counts as started from the 1st of its start month.
    assert not terms.is_future("2264", date(2026, 6, 1))
    assert terms.is_future("2264", date(2026, 5, 31))
