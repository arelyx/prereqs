"""Fetch stage: one ``action=results`` POST per term, saved raw into the snapshot.

Why a single request per term instead of paginating: ``rec_start`` is silently
ignored by ``action=results`` (you always get page 1), and paging requires
``action=next`` with off-by-one semantics — but arbitrary ``rec_dur`` values
are honored, so one request with ``rec_dur`` above any plausible term size
(quarters run ~1,400-1,700 primary sections) returns everything, verifiable
against the page's own count line. See the research doc §2 "Pagination".

Why the query is shaped this way:
- ``binds[:reg_status]=all`` — the page default ``O`` hides closed classes.
- ``binds[:subject]`` empty — empty string means all subjects; iterating the
  current subject dropdown would *miss* historical subjects (AMS, CMPS, ...).
- all four instruction-mode flags — each flag includes a mode; omitting one
  excludes those sections.
"""

from __future__ import annotations

import sys
import time

from common.guards import ScrapeDriftError, expect
from common.http import PoliteSession
from common.snapshot import SnapshotWriter

from . import terms

PISA_URL = "https://pisa.ucsc.edu/class_search/index.php"

# Upper bound on rows returned in the single results request. A whole quarter
# is ~1,500-1,700 sections; parse.py aborts if the count line ever exceeds
# what one page covered, so an undersized value fails fast rather than
# silently truncating.
REC_DUR = 3000


def results_params(term_code: str, rec_dur: int = REC_DUR) -> dict[str, str]:
    """Full POST body for an all-classes, all-subjects, all-modes term search.

    Every field the real form submits is included — the server was only ever
    tested with the complete set, and PHP apps of this vintage can behave
    differently with absent vs. empty parameters.
    """
    terms.parse_code(term_code)  # validate before it hits the network
    return {
        "action": "results",
        "binds[:term]": term_code,
        "binds[:reg_status]": "all",
        "binds[:subject]": "",
        "binds[:catalog_nbr_op]": "=",
        "binds[:catalog_nbr]": "",
        "binds[:title]": "",
        "binds[:instr_name_op]": "=",
        "binds[:instructor]": "",
        "binds[:ge]": "",
        "binds[:crse_units_op]": "=",
        "binds[:crse_units_from]": "",
        "binds[:crse_units_to]": "",
        "binds[:crse_units_exact]": "",
        "binds[:days]": "",
        "binds[:times]": "",
        "binds[:acad_career]": "",
        "binds[:asynch]": "A",
        "binds[:hybrid]": "H",
        "binds[:synch]": "S",
        "binds[:person]": "P",
        "rec_start": "0",
        "rec_dur": str(rec_dur),
    }


def fetch_term_html(session: PoliteSession, term_code: str, rec_dur: int = REC_DUR) -> str:
    """POST the results search for one term; return the page as text.

    The server declares ``charset=UTF-8`` in Content-Type, so requests decodes
    correctly on its own; we assert the declaration rather than guess.
    """
    resp = session.post(PISA_URL, data=results_params(term_code, rec_dur))
    ctype = resp.headers.get("content-type", "")
    expect("text/html" in ctype, "results response is not HTML", term=term_code, content_type=ctype)
    expect(
        (resp.encoding or "").upper() == "UTF-8",
        "results response no longer declares UTF-8",
        term=term_code, encoding=resp.encoding,
    )
    return resp.text


def fetch_terms(
    session: PoliteSession, term_codes: list[str], writer: SnapshotWriter
) -> dict[str, str]:
    """Fetch each term and stage its raw HTML as raw/<term_code>.html.

    Raw pages go into the snapshot *before* parsing so an abort after a parse
    guard still leaves nothing visible (staging dir is discarded whole), while
    a finalized snapshot always carries the exact bytes the parse saw.
    """
    htmls: dict[str, str] = {}
    for i, code in enumerate(term_codes):
        try:
            html = fetch_term_html(session, code)
        except ScrapeDriftError as exc:
            # Long backfills stress the server (observed: 504s after ~10 big
            # requests). One cooldown retry per term before the fail-fast
            # abort — 504 pressure is transient, page drift is not.
            print(f"  {code}: {exc}; cooling down 90s and retrying once",
                  file=sys.stderr, flush=True)
            time.sleep(90)
            html = fetch_term_html(session, code)
        path = writer.path(f"raw/{code}.html")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html, encoding="utf-8")
        htmls[code] = html
        print(f"  fetched {code} ({i + 1}/{len(term_codes)}, {len(html) // 1024} KB)",
              file=sys.stderr, flush=True)
    return htmls
