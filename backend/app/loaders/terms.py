"""UCSC term-code math (pisa STRM codes) for the loader and validators.

code = 2000 + (year - 2000) * 10 + {winter: 0, spring: 2, summer: 4, fall: 8}
The int value of the code is chronologically ordered, so it doubles as
sort_key. Fall belongs to the academic year that starts that fall.
"""

from __future__ import annotations

DIGIT_TO_SEASON = {0: "winter", 2: "spring", 4: "summer", 8: "fall"}
SEASON_TO_DIGIT = {v: k for k, v in DIGIT_TO_SEASON.items()}


def parse_term_code(code: str) -> tuple[int, str]:
    """'2268' -> (2026, 'fall'). Raises on malformed codes."""
    n = int(code)
    year = 2000 + (n - 2000) // 10
    digit = (n - 2000) % 10
    if digit not in DIGIT_TO_SEASON:
        raise ValueError(f"invalid term code {code!r}: quarter digit {digit}")
    return year, DIGIT_TO_SEASON[digit]


def term_code(year: int, season: str) -> str:
    return str(2000 + (year - 2000) * 10 + SEASON_TO_DIGIT[season])


def next_terms(start_code: str, count: int, include_summer: bool = False) -> list[str]:
    """Chronological term codes strictly after start_code."""
    year, season = parse_term_code(start_code)
    order = ["winter", "spring", "summer", "fall"]
    out: list[str] = []
    idx = order.index(season)
    while len(out) < count:
        idx += 1
        if idx == len(order):
            idx = 0
            year += 1
        s = order[idx]
        if s == "summer" and not include_summer:
            continue
        out.append(term_code(year, s))
    return out
