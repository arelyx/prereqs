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

from . import parse, terms

PISA_URL = "https://pisa.ucsc.edu/class_search/index.php"

# Rows per page. One monolithic request (rec_dur=3000, ~5-7 MB) triggered
# upstream 504s under sustained load; ~300 rows is ~1.1 MB and generates
# fast. Pagination semantics (verified live on term 2262, 2026-07-25):
#   page 1:  action=results, rec_start ignored           -> rows 1..dur
#   page k:  action=next, rec_start=(k-2)*dur            -> rows (k-1)*dur+1..
# i.e. action=next serves the page AFTER the window [rec_start+1, rec_start+dur].
# Overshooting the total returns an empty page (no count line) — the loop
# never requests past the total. action=results always resets to page 1, so
# each term starts with a results call in the same session.
PAGE_SIZE = 300
REC_DUR = PAGE_SIZE  # kept name for manifest continuity


def results_params(
    term_code: str,
    rec_dur: int = PAGE_SIZE,
    action: str = "results",
    rec_start: int = 0,
) -> dict[str, str]:
    """Full POST body for an all-classes, all-subjects, all-modes term search.

    Every field the real form submits is included — the server was only ever
    tested with the complete set, and PHP apps of this vintage can behave
    differently with absent vs. empty parameters.
    """
    terms.parse_code(term_code)  # validate before it hits the network
    return {
        "action": action,
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
        "rec_start": str(rec_start),
        "rec_dur": str(rec_dur),
    }


def _fetch_page(
    session: PoliteSession, term_code: str, action: str, rec_start: int, page_size: int
) -> str:
    resp = session.post(
        PISA_URL,
        data=results_params(term_code, page_size, action=action, rec_start=rec_start),
    )
    ctype = resp.headers.get("content-type", "")
    expect("text/html" in ctype, "results response is not HTML", term=term_code, content_type=ctype)
    expect(
        (resp.encoding or "").upper() == "UTF-8",
        "results response no longer declares UTF-8",
        term=term_code, encoding=resp.encoding,
    )
    return resp.text


def fetch_term_rows(
    session: PoliteSession,
    term_code: str,
    writer: SnapshotWriter,
    page_size: int = PAGE_SIZE,
) -> list[dict]:
    """Fetch one term via small-page pagination; return parsed offering rows.

    Raw pages are staged as raw/<term>/page<NN>.html before parsing, so a
    finalized snapshot always carries the exact bytes the parse saw. Guards:
    per-page window arithmetic must be continuous, the total must not change
    between pages, assembled rows must equal the total, and class numbers
    must be unique across pages (overlap/skip detection).
    """
    raw_dir = writer.path(f"raw/{term_code}")
    raw_dir.mkdir(parents=True, exist_ok=True)

    html = _fetch_page(session, term_code, "results", 0, page_size)
    (raw_dir / "page01.html").write_text(html, encoding="utf-8")
    rows, first, last, total = parse.parse_page(html, term_code)
    if total == 0:
        return []
    expect(first == 1, "first page does not start at row 1", term=term_code, first=first)

    all_rows = rows
    page = 2
    while last < total:
        rec_start = (page - 2) * page_size
        html = _fetch_page(session, term_code, "next", rec_start, page_size)
        (raw_dir / f"page{page:02d}.html").write_text(html, encoding="utf-8")
        rows, f, l, t = parse.parse_page(html, term_code)
        expect(t == total, "total changed between pages", term=term_code, was=total, now=t)
        expect(
            f == (page - 1) * page_size + 1,
            "page window discontinuity",
            term=term_code, expected=(page - 1) * page_size + 1, got=f,
        )
        all_rows.extend(rows)
        last = l
        page += 1

    class_numbers = [r["class_number"] for r in all_rows]
    expect(
        len(class_numbers) == len(set(class_numbers)),
        "duplicate class numbers across pages (pagination overlap)",
        term=term_code,
    )
    expect(
        len(all_rows) == total,
        "assembled rows != count-line total",
        term=term_code, rows=len(all_rows), total=total,
    )
    return all_rows


def fetch_terms(
    session: PoliteSession, term_codes: list[str], writer: SnapshotWriter
) -> dict[str, list[dict]]:
    """Fetch every term (paginated); returns {term_code: offering rows}."""
    out: dict[str, list[dict]] = {}
    for i, code in enumerate(term_codes):
        try:
            out[code] = fetch_term_rows(session, code, writer)
        except ScrapeDriftError as exc:
            # Server pressure is transient (504s); page drift is not. One
            # cooldown retry per term before the fail-fast abort.
            print(f"  {code}: {exc}; cooling down 90s and retrying once",
                  file=sys.stderr, flush=True)
            time.sleep(90)
            out[code] = fetch_term_rows(session, code, writer)
        print(f"  fetched {code} ({i + 1}/{len(term_codes)}, {len(out[code])} rows)",
              file=sys.stderr, flush=True)
    return out
