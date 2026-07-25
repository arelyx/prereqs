# ucsc/pisa_offerings

Deterministic scraper for UCSC's pisa class search
(`https://pisa.ucsc.edu/class_search/index.php`): one `action=results` POST
per term → offering rows per section. No LLM anywhere in this pipeline.

Primary research: `docs/universities/ucsc/source-pisa-class-search.md`.
This README records what implementation added to or *corrected* in that doc.

## Running

```bash
cd pipelines
.venv/bin/python -m ucsc.pisa_offerings.run --terms 2260,2262
.venv/bin/python -m ucsc.pisa_offerings.run --from 2048 --to 2268   # full backfill
```

Snapshot output (`data/ucsc/pisa_offerings/<ts>/`):

- `raw/<term_code>.html` — exact bytes each parse saw (audit/replay).
- `offerings.json` — all terms concatenated; shape mirrors
  `course_offerings` in `docs/DATA_MODEL.md`.
- `terms.json` — per term: `term_code`, `year`, `season`, `academic_year`,
  `sort_key`, `row_count`.
- `manifest.json` — provenance + per-term row counts.

## Term-code math

`code = "2" + YY + season_digit`, season digits `{0: winter, 2: spring,
4: summer, 8: fall}`. The digits are sparse, so `int(code)` is already a
chronological sort key (winter < spring < summer < fall within a calendar
year). **Fall belongs to the calendar year it starts in** — Fall 2026 is
`2268`, and it opens academic year 2026-2027, while Winter/Spring/Summer 2026
(`2260/2262/2264`) close academic year 2025-2026. Range enumeration must skip
the nonexistent digits (after `2254` comes `2258`, not `2256`) — see
`terms.enumerate_codes`. Pisa's history starts at `2048` (Fall 2004); Winter–
Summer 2004 codes are validly formed but have no data.

## Why no pagination

`rec_start` is **silently ignored** by `action=results` — you always get page
1, so naive offset paging would loop on the same rows forever. Real paging
needs `action=next` with off-by-one semantics. We avoid the whole mechanism:
arbitrary `rec_dur` values are honored, so a single request with
`rec_dur=3000` (a quarter tops out ~1,700 primary sections) returns
everything. The page's own count line (`<b>1</b> - <b>N</b> of <b>TOTAL</b>`)
is then asserted three ways: starts at 1, N == TOTAL (i.e. one page covered
everything — fires if `rec_dur` ever becomes too small), and TOTAL == number
of `rowpanel_*` divs parsed.

## Query shape (all classes, not just open ones)

- `binds[:reg_status]=all` — the form default `O` returns open classes only;
  forgetting this roughly halves the row count (which the 200-row floor guard
  would catch).
- `binds[:subject]=""` — empty means all subjects. Never iterate the subject
  dropdown for historical terms: it lists only *current* codes, and old terms
  use retired subjects (`AMS`→`AM`, `CMPS`/`CMPE`→`CSE`), so per-subject
  iteration silently drops them.
- All four instruction-mode flags (`asynch=A, hybrid=H, synch=S, person=P`)
  — each flag *includes* a mode; omitting one excludes those sections.
- Every other form field is sent empty, matching a real browser submit; PHP
  apps of this vintage may distinguish absent from empty parameters.

## Encoding

Responses declare `Content-Type: text/html; charset=UTF-8` and really are
UTF-8 (verified against chardet's guess on full pages). `fetch.py` asserts
the declaration and re-saves with explicit `encoding="utf-8"`; the triple
`&nbsp;` in headings decodes to `\xa0\xa0\xa0`, which is what the parser
splits on (not literal spaces).

## Parsing quirks observed live (2026-07-25, terms 2262 + 2148)

- **Section format is looser than the research doc claims.** The doc's
  marker regex `^[A-Z]+ \S+ - \d+\w*$` fails on historical terms: Fall 2014
  has `CMPS 115 - EXTN` / `EART 110A - EXTN` (UNEX extension shells) and
  `PHYE 9C - 3` (bare single digit). The parser accepts `[0-9A-Z]{1,4}` for
  the section. This was the only research-doc assertion that broke.
- **Historical terms render with the modern template.** Fall 2014 rows carry
  an `Instruction Mode` div (all "In Person") even though the concept
  postdates 2014 — PeopleSoft re-renders old data through today's UI, so the
  modality field on pre-2020 terms is a backfill artifact, not a record.
  Parser still treats modality/location/day-time divs as optional (`None`)
  in case truly old templates differ.
- **Cancelled sections** have `days_times == "Cancelled Cancelled"` (the
  word appears twice in the markup, verbatim) and a bare location like
  `LEC`/`STU` with no room.
- **Enrollment can exceed capacity, and capacity can be 0** — e.g. Spring
  2026 ART 157: `17 of 0 Enrolled`. Do not "sanitize" these.
- **`Staff` placeholder rates** (share of primary-section rows): Spring 2026
  = 61/1429 (4.3%), Fall 2014 = 104/1503 (6.9%), and the research doc
  measured Fall 2026 pre-enrollment at 275/1501 (18%). Staff rate scales
  with how far in the future the term is; it is kept as a literal
  instructor name `"Staff"` (DATA_MODEL: Staff = TBD).
- **Multiple instructors** are `<br>`-separated inside one div (65/1429 in
  Spring 2026). Parse the div's *text nodes* individually; `get_text()` on
  the div would fuse names into `Jackson,J.Karlic,K.`.
- **Malformed HTML** is normal (stray `</span>` closers, uppercase `<H2>`,
  a double-URL-encoded detail href) — hence BeautifulSoup `html.parser`,
  which is lenient, over a strict/validating parser.
- The panel body also grew a **"Course Readers" link div** not present in
  the research doc's excerpt; the parser addresses fields by their
  `sr-only` labels, not positional divs, so additions like this are inert.
- **Zero-results pages** contain `Sorry. Your search:` and no count line.
  `parse_results` returns `[]` only for that marker; `run.py` then accepts
  emptiness only for terms that have not started yet (`terms.is_future`,
  season start months rounded down to be strict).

## Guards (fail-fast, any failure aborts + discards staging)

| guard | where |
|---|---|
| response is HTML and declares UTF-8 | `fetch.fetch_term_html` |
| count line present (or zero-results marker), starts at 1, one page covered all, TOTAL == rowpanel count | `parse.parse_results` |
| exactly one `CLASS_NBR` hidden input per panel; heading link id matches it | `parse._parse_panel` |
| heading splits on triple-nbsp; code part matches `SUBJ CATNBR - SECT` | `parse._parse_panel` |
| status icon, instructor text (≥1 name), `N of M Enrolled` present per row | `parse._parse_panel` |
| per-term row count: 200–3000 (fall/winter/spring), 50–3000 (summer) | `run.run` |
| every `course_code` matches `common.codes.COURSE_ID_RE` | `run.run` |
| zero results only for future terms | `run.run` |

## Test fixture provenance

`tests/fixtures/results_2262_trimmed.html` is 10 verbatim rowpanels cut from
the real Spring 2026 (`2262`) results page fetched 2026-07-25, chosen to
cover: multi-instructor, Staff, all four modalities, a cancelled section, an
empty day/time, a lettered catalog number, and over-enrollment with capacity
0. The count line was rewritten from 1429 to 10 to match; nothing inside the
panels was edited. The full ~5.5 MB page is deliberately not committed.
