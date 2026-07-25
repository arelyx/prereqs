"""Fetch the Baskin SOE department calendar pages.

One GET per department slug (10 requests). The department slugs are the ONLY
URLs this pipeline constructs: they are lowercase-stable and documented in
docs/universities/ucsc/source-soe-schedule.md. Per-course and per-section
URLs are NEVER constructed — the site's URL casing is inconsistent and a
wrong-case course path returns HTTP 500 (not 404, not a redirect). This
pipeline does not need per-course pages at all: the department tables carry
the entire upcoming-year plan.
"""

from __future__ import annotations

from common.guards import expect
from common.http import PoliteSession
from common.snapshot import SnapshotWriter

BASE_URL = "https://courses.engineering.ucsc.edu"

# Definitive department list from the research doc (nav + landing page).
# `game` covers both "Games and Playable Media" and "Serious Games" (two nav
# entries, one page). Legacy pre-2019 codes (ams/cmpe/cmps/ee) are historical
# only and deliberately excluded.
DEPARTMENTS = ("am", "bme", "cmpm", "cse", "ece", "game", "hci", "nlp", "stat", "tim")


def fetch_department_pages(session: PoliteSession, writer: SnapshotWriter) -> dict[str, str]:
    """Fetch every department calendar page; save raw HTML into the snapshot.

    Returns {dept_slug: html}. Raw pages land at raw/<dept>.html so a parse
    bug can be replayed against the exact bytes that triggered it.
    """
    pages: dict[str, str] = {}
    for dept in DEPARTMENTS:
        resp = session.get(f"{BASE_URL}/courses/{dept}")
        html = resp.text
        # Cheap sanity before parse: an error/login/redirect page would lack
        # the schedule module's CSS classes entirely.
        expect(
            "soe-classes-schedule-th" in html,
            "department page lacks soe-classes-schedule markup",
            dept=dept, url=resp.url, size=len(html),
        )
        raw = writer.path(f"raw/{dept}.html")
        raw.parent.mkdir(parents=True, exist_ok=True)
        raw.write_text(html)
        pages[dept] = html
    return pages
