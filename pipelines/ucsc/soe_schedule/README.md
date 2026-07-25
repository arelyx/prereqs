# ucsc/soe_schedule — Baskin SOE planned schedule

Scrapes the per-department "Calendar" pages on
`courses.engineering.ucsc.edu` — the School of Engineering's **planned**
schedule for the upcoming academic year (sections + instructor assignments
per quarter). Ten requests, one per department: `am bme cmpm cse ece game
hci nlp stat tim` (`game` covers both "Games and Playable Media" and
"Serious Games" nav entries; legacy pre-2019 codes ams/cmpe/cmps/ee are
historical-only and excluded).

Full source research: `docs/universities/ucsc/source-soe-schedule.md`.

## Running

```bash
cd pipelines
source .venv/bin/activate
python -m ucsc.soe_schedule.run
```

Snapshot output (`data/ucsc/soe_schedule/<ts>/`):

- `raw/<dept>.html` — the exact bytes fetched, for replaying parse bugs.
- `planned.json` — one record per planned section per quarter:
  `{dept, course_code, display_code, title, term: {academic_year, quarter,
  term_code}, section, instructors: [{name, cruzid?}], modality_note}`.
- `manifest.json` — provenance + per-department course/offering counts.

Maps to `course_offerings` with `source='soe'`, `is_planned=true`
(docs/DATA_MODEL.md). `term_code` uses the pisa math:
`2000 + (year-2000)*10 + {winter:0, spring:2, summer:4, fall:8}` —
Fall 2026 → `2268`, Winter 2027 → `2270`.

## Quirks (all observed live 2026-07-25; each is guarded or handled)

**Malformed HTML — rows "closed" with a literal `<tr>`.** Every sections
row terminates with `<tr>` instead of `</tr>`. A strict XML parser mis-nests
the whole table. We parse with BeautifulSoup `html.parser` (lenient) and
never trust `<tr>` nesting: the parser walks the table's `td`/`th` cells in
flat document order (division header → quarter headers → course-name cell →
exactly 4 section cells, guarded).

**Errors are HTTP 500, not 404 — and URL casing matters.** Unknown course
paths (`/courses/cse999`) and *wrong-case* course paths (`/courses/CSE101`
instead of `/courses/cse101`) both return 500. Course-page hrefs use
lowercase prefixes with mixed-case suffix letters that differ by department
(`/courses/am11A` but `/courses/cse101x`); section hrefs use uppercase codes
(`/courses/CSE12/Fall26/01`). Therefore this pipeline **never constructs
per-course or per-section URLs** — it only constructs the ten department
slugs (lowercase-stable, verified) and records hrefs exactly as harvested.
It never needs to follow them: the department tables carry the whole plan.

**`Staff` means "not assigned yet", not a person.** Instructors appear as
`Full Name (cruzid)` or the literal `Staff`. `Staff` is emitted as
`{"name": "Staff"}` with no `cruzid`; downstream must treat it as
TBD, never as an instructor identity. Any other line shape is drift and
aborts. A section can list several instructors (e.g. CSE280S has two).

**Displayed codes are unspaced.** The site shows `CSE12`, `AM11A`,
`CSE290X` — which happens to equal our canonical form (`common.codes`).
Every parsed code is normalized and validated against the course-code regex;
`display_code` re-inserts the space (`CSE 12`) for UI use.

**The `<i>` note is free text, not strictly modality.** The research doc
had only observed `Synchronous Online`, but a live scrape (2026-07-25) also
shows spelling variants (`Asych online`, `Asynch online`, `Instruction
Mode: Synchronous Online`), class topics (`Class Topic: Intro to Hacking`),
and even an upstream test artifact (`this course is added for a testing
purpose.`). It is captured verbatim as `modality_note` and must not be
enum-parsed downstream.

**This is a plan, not a record.** Sections are added/dropped and
instructors reassigned before enrollment. Load with `is_planned=true`; the
registrar's Class Search (pisa) is the enrollment truth.

**Summer column is late-populated.** In July the upcoming-AY Summer cells
are all empty. An empty cell means "not planned (yet)", never "not offered
in summer". Do not derive negative availability signals from it.

**A listed course with four empty cells is real.** It's in the calendar but
not planned for any quarter that year (e.g. CSE5J, CSE112 in 2026-27). We
keep it in the parsed `courses` list (it counts toward plausibility guards)
but it yields zero offerings.

**Header text quirks.** `Winter 2027 ` has a trailing space (stripped
before matching). Division headers (`Lower Division` / `Upper Division` /
`Graduate`) are bare `th[colspan=4]` rows interleaved in the same single
table, and the quarter-header row repeats after each division header — all
repeats are guarded to spell the identical academic year (Fall Y,
Winter/Spring/Summer Y+1).

**Year rollover.** Each department page shows exactly one academic year and
flips (likely in spring) to the next. The year is always read from the
`<th>` headers, never assumed; departments disagreeing on the academic year
(a mid-rollover scrape) aborts the run. Pages link `« Back to
<prev AY>` archive pages (`/courses/cse/2025`) — not fetched, but a useful
future source for history without per-course pages.

**Unversioned custom markup.** The `soe-classes-schedule-*` classes come
from a custom Drupal 9 module; `<td>`s carry inline styles (hand-rolled
templates). We match only on the classes and href patterns, never styles. A
Drupal upgrade may change wrappers — that's what the guards are for.

## Guards (fail-fast; any violation discards staging)

- Fetch: HTTP 200 (PoliteSession) and `soe-classes-schedule-th` present in
  every department page body.
- Exactly one `<table>` per department page.
- Quarter headers: present, groups of 4, `Fall/Winter/Spring/Summer` order,
  one consistent AY across all repeats and (in run.py) across departments.
- Course-name rows: `CODE: Title` shape; every code passes
  `common.codes.COURSE_ID_RE`; each course row followed by exactly 4
  quarter cells.
- Section hrefs match `^/courses/{CODE}/{Quarter}{yy}/{nn}$`, with the
  embedded code equal to the course row's and the embedded term equal to
  the column header's.
- Instructor lines match `Staff` or `Name (cruzid)`.
- Counts: ≥ 5 courses per department (cse ≥ 100); total courses across
  departments in 400–1200 (landing page advertises ~734).
