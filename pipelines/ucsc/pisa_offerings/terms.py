"""UCSC PeopleSoft term-code (STRM) math.

Codes are four digits: ``2`` + last two digits of the calendar year + a season
digit — ``2262`` = Spring 2026. The season digits are sparse (0/2/4/8), so the
integer value of a code is already chronological: within a calendar year
winter(0) < spring(2) < summer(4) < fall(8), and Fall belongs to the calendar
year it *starts* in (Fall 2026 = 2268, not 2270). Academic years therefore
start at the fall code: Fall 2026 opens academic year 2026-2027, while
Winter/Spring/Summer 2026 close academic year 2025-2026.

Invalid codes raise ValueError — these helpers guard *our* inputs, not the
upstream page (page-shape drift uses common.guards.expect elsewhere).
"""

from __future__ import annotations

import re
from datetime import date

SEASON_BY_DIGIT: dict[int, str] = {0: "winter", 2: "spring", 4: "summer", 8: "fall"}
DIGIT_BY_SEASON: dict[str, int] = {v: k for k, v in SEASON_BY_DIGIT.items()}
# Chronological season order within one calendar year.
SEASON_ORDER: list[str] = ["winter", "spring", "summer", "fall"]

# Approximate first month of instruction per season (winter starts early Jan,
# spring late Mar, summer late Jun, fall late Sep). Used only by is_future(),
# and rounded *down* so a term counts as "started" slightly early — we would
# rather flag an unexpectedly empty current term than excuse it.
_SEASON_START_MONTH: dict[str, int] = {"winter": 1, "spring": 3, "summer": 6, "fall": 9}

TERM_CODE_RE = re.compile(r"^2\d{3}$")


def parse_code(code: str) -> tuple[int, str]:
    """'2262' -> (2026, 'spring'). Raises ValueError on malformed codes."""
    if not TERM_CODE_RE.match(code):
        raise ValueError(f"malformed term code: {code!r}")
    digit = int(code[3])
    if digit not in SEASON_BY_DIGIT:
        raise ValueError(f"term code {code!r} has invalid season digit {digit}")
    return 2000 + int(code[1:3]), SEASON_BY_DIGIT[digit]


def code_for(year: int, season: str) -> str:
    """(2026, 'spring') -> '2262'. Valid for calendar years 2000-2099."""
    if season not in DIGIT_BY_SEASON:
        raise ValueError(f"unknown season: {season!r}")
    if not 2000 <= year <= 2099:
        raise ValueError(f"year out of term-code range: {year}")
    return f"2{year % 100:02d}{DIGIT_BY_SEASON[season]}"


def sort_key(code: str) -> int:
    """Chronological sort key. The integer code itself orders correctly."""
    parse_code(code)  # validate
    return int(code)


def academic_year(code: str) -> str:
    """'2268' -> '2026-2027'; '2262' -> '2025-2026' (fall starts the year)."""
    year, season = parse_code(code)
    start = year if season == "fall" else year - 1
    return f"{start}-{start + 1}"


def enumerate_codes(from_code: str, to_code: str) -> list[str]:
    """All term codes from from_code to to_code, inclusive, chronological.

    Purely generative — includes codes pisa may not have data for (e.g. the
    dropdown starts at 2048; Winter-Summer 2004 never existed there).
    """
    lo, hi = sort_key(from_code), sort_key(to_code)
    if lo > hi:
        raise ValueError(f"from_code {from_code} is after to_code {to_code}")
    out: list[str] = []
    year, season_idx = parse_code(from_code)[0], SEASON_ORDER.index(parse_code(from_code)[1])
    while True:
        code = code_for(year, SEASON_ORDER[season_idx])
        if int(code) > hi:
            return out
        out.append(code)
        season_idx += 1
        if season_idx == len(SEASON_ORDER):
            season_idx, year = 0, year + 1


def is_future(code: str, today: date | None = None) -> bool:
    """True if the term's instruction has not plausibly started yet.

    Used to decide whether a zero-results page is acceptable (future terms may
    not be published) or a fail-fast violation (past terms must have rows).
    """
    year, season = parse_code(code)
    today = today or date.today()
    return date(year, _SEASON_START_MONTH[season], 1) > today
