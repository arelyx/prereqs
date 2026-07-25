# UCSC Baskin School of Engineering — Course Schedule Site (courses.engineering.ucsc.edu)

**Researched:** 2026-07-25
**Verdict:** High-value source. The per-department "Calendar" pages are the SOE's *planned* schedule
for the upcoming academic year (currently **Fall 2026 – Summer 2027**), including planned sections and
instructor assignments. Per-course pages additionally carry a 5-year offering/instructor history. This
is strictly better than "typically offered" heuristics for SOE departments.

**Platform:** Drupal 9 (`<meta name="Generator" content="Drupal 9 (https://www.drupal.org)" />`), a
custom BSOE theme (`bsoe_specific`) and a custom module (CSS classes prefixed `soe-classes-schedule-*`).
Not WordPress. Server-rendered HTML, no JS needed, no auth needed (a SAML "Log in" exists but only
gates instructor editing features).

---

## 1. Site map / URL patterns

| URL | What it is |
|---|---|
| `/courses/` | Landing page: intro line + one `<h2>` per department + `<ul>` of every course link (~734 courses total). |
| `/courses/{dept}` (e.g. `/courses/cse`) | **The schedule page** ("Calendar") for one department: planned sections for the upcoming AY, by quarter. |
| `/courses/{deptNNNx}` (e.g. `/courses/cse101`) | Per-course page: title, catalog description, prerequisites, credits, and an offering-history table (AY × quarter, with sections + instructors), currently 2022-23 through 2026-27. |
| `/courses/{DEPTNNN}/{Quarter}{YY}/{section}` (e.g. `/courses/CSE12/Fall26/01`) | Per-section page: course title + term, instructor(s), Canvas-link placeholder. Little else. |
| `/pre-reshaping-departments` | Links to legacy department calendars: `/courses/ams`, `/courses/cmpe`, `/courses/cmps`, `/courses/ee` (pre-2019 codes AMS/CMPE/CMPS/EE — historical only). |

The main nav menu is literally titled **"Calendars"** and lists the department schedule pages — there is
no separate "Course Schedule" path; the department pages *are* the schedule. The landing page confirms:

> "To see a schedule for an entire department, click the department name. To see the schedule for an
> individual course, click on the course name below."

### Departments covered (current)

From the nav and landing page (`/courses/`), with course-link counts on the landing page:

| Slug | Department | # course links |
|---|---|---|
| `am` | Applied Mathematics | 50 |
| `bme` | Biomolecular Engineering | 99 |
| `cmpm` | Computational Media | 88 |
| `cse` | Computer Science and Engineering | 230 |
| `ece` | Electrical and Computer Engineering | 145 |
| `game` | Games and Playable Media **and** Serious Games (two nav entries, one page) | 28 |
| `hci` | Human Computer Interaction | 11 |
| `nlp` | Natural Language Processing | 14 |
| `stat` | Statistics | 41 |
| `tim` | Technology & Information Management | 28 |

All requested departments (CSE, ECE, BME, AM, STAT, CMPM, TIM) are covered, plus the grad-program
codes GAME/HCI/NLP. **Not covered:** anything outside SOE (MATH, PHYS, ECON, ...), so this source
cannot answer quarter-offering questions for non-SOE prerequisites.

---

## 2. Department schedule page structure (`/courses/cse` etc.)

One `<table>` per page, organized as: a division header row (`Lower Division` / `Upper Division` /
`Graduate`), then a repeated quarter-header row, then for each course a **name row** followed by a
**sections row** with 4 cells (one per quarter). Verified identical structure on `/courses/cse` and
`/courses/stat`.

Real excerpt from `/courses/cse` (fetched 2026-07-25):

```html
<th colspan="4" style="background-color: #f0f0f0; ...">Lower Division</th>
<tr>
  <th width="25%" class="soe-classes-schedule-th">Fall 2026</th>
  <th width="25%" class="soe-classes-schedule-th">Winter 2027 </th>   <!-- note trailing space -->
  <th width="25%" class="soe-classes-schedule-th">Spring 2027</th>
  <th width="25%" class="soe-classes-schedule-th">Summer 2027</th>
</tr>
  <tr><td colspan="4" class="soe-classes-schedule-course-name">
    <a href="/courses/cse12">
    CSE12: Computer Systems and Assembly Language and Lab
    </a></td></tr>
  <tr>
        <td style="border: ..."><ul>
              <li><a href="/courses/CSE12/Fall26/01">Section 01</a>
        <br>
                  Heiner H Litz (hlitz)
          <br>
                <i></i>
        </li>
              <li><a href="/courses/CSE12/Fall26/02">Section 02</a>
        <br>
                  Marcelo Siero (msiero2)
          <br>
                  <i>Synchronous Online</i>
        </li>
          </ul></td>
        ...three more <td> for Winter/Spring/Summer...
      <tr>          <!-- sic: rows are CLOSED WITH A LITERAL "<tr>" — malformed HTML -->
```

**What one course row yields:**
- Course code + title (from the name row, e.g. `CSE12: Computer Systems and Assembly Language and Lab`)
  and the per-course page href (`/courses/cse12`).
- Per quarter (Fall/Winter/Spring/Summer of the shown AY): zero or more sections, each with
  - section link `/courses/CSE12/Fall26/01` (encodes canonical code, term, section number),
  - instructor as `Full Name (cruzid)` — or the literal `Staff` when unassigned,
  - an optional `<i>...</i>` note (observed: `Synchronous Online`; usually empty).
- A course with an all-empty sections row is listed in the calendar but **not planned for any quarter**
  that year (e.g. CSE5J currently).

**Current data snapshot (July 2026):** the pages show AY 2026-27. On `/courses/cse`: 66 Fall, 63
Winter, 66 Spring section links, **0 Summer** — summer planning is added later, so an empty Summer
column does not mean "never offered in summer".

---

## 3. Per-course pages (`/courses/cse101`)

Much richer than the general catalog for planning purposes:

- Title, full catalog description, **prerequisites as text** (spaced catalog style: "Prerequisite(s):
  CSE 12 or BME 160; CSE 13E or ECE 13 or CSE 13S; and CSE 16; ..."), credit count.
- An **offering-history table**, header `Year | Fall | Winter | Spring | Summer`, one row per academic
  year — currently 2026-27 back through 2022-23 — each cell holding the section links and instructors
  for that term. Excerpt:

```html
<tr>
  <th width="16%" class="soe-classes-schedule-th">Year</th>
  <th width="21%" class="soe-classes-schedule-th">Fall</th>
  ...
<tbody>
  <tr>
    <td>2026-27</td>
    <td><ul>
    <li>
      <a href="/courses/cse101/Fall26/01"> Section 01 </a>
      <br>
              Staff
        <br>
            <i></i>
    </li>
    <li>
      <a href="/courses/cse101/Fall26/02"> Section 02 </a>
      <br>
              Ishtiyaque Ahmad (isahmad)
      ...
```

So per-course pages give: **instructor history, quarter-offering history over ~5 years, and the
upcoming-year plan** — ideal for deriving robust "typically offered" signals and instructor patterns.
No syllabi; section pages only add a Canvas link slot.

Extra vs. catalog: history + planned sections + instructors. Redundant vs. catalog: description,
prereq text (catalog/registrar remains the authority for degree rules; prereqs here are prose only).

---

## 4. Cross-referencing with catalog codes

- Displayed codes have **no space**: `CSE101`, `AM11A`, `CSE290X`. Normalize by splitting the alpha
  prefix from the rest and inserting a space + uppercasing → `CSE 101`, `AM 11A`, `CSE 290X`. This
  then matches registrar/catalog codes exactly (the site's own prerequisite prose uses the spaced
  form, e.g. "CSE 12 or BME 160").
- Suffix letters exist for multi-part and special-topics courses: `AM 11A/11B`, `AM 170A/170B`,
  `CSE 290A`–`CSE 290X` (each special-topics letter is its own page/row), `CSE 196A`, `STAT 17L`.
- **URL casing is inconsistent and matters.** Course-page hrefs are lowercase prefix with
  *mixed-case* suffix letters that differ by dept (`/courses/am11A` uppercase A, but `/courses/cse101x`
  lowercase x). Section hrefs use uppercase codes (`/courses/CSE12/Fall26/01`). Department pages are
  linked both as `/courses/cse` (menu) and `/courses/CSE` (landing h2) — both work. But
  `GET /courses/CSE101` (wrong case for a course page) returns **HTTP 500**, not a redirect. Never
  construct course URLs; always use hrefs harvested from the pages.
- Cross-listing is not marked on schedule pages (no "cross-listed" text found); cross-listed courses
  simply appear under their SOE code. A cross-listed non-SOE twin (e.g. a MATH twin) will not appear.
- Legacy pre-2019 codes (AMS/CMPS/CMPE/EE) live only under `/pre-reshaping-departments` calendars;
  ignore for current planning, useful only for very old history.

---

## 5. Hazards & fail-fast markers

Hazards:
1. **Malformed HTML**: sections rows terminate with a literal `<tr>` instead of `</tr>`. Strict XML
   parsers will mis-nest rows — use a lenient parser (BeautifulSoup `html.parser`/`html5lib`).
2. **Errors are 500, not 404**: unknown course paths (`/courses/cse999`) and wrong-case course paths
   (`/courses/CSE101`) both return HTTP 500. A scraper cannot distinguish "removed course" from
   "server bug" by status code alone.
3. **Summer column is late-populated** — empty in July for the upcoming AY. Don't record
   "not offered in summer" from an empty cell early in the cycle.
4. **Plan, not commitment**: instructors show as `Staff` until assigned; sections can be added/dropped
   before enrollment. Treat as planning data; the registrar's Class Search is the enrollment truth.
5. **Year rollover**: dept pages show exactly one AY and will flip (likely spring) to the next year.
   Record the year labels from the `<th>` headers with every scrape; never assume.
6. Header text quirks: `Winter 2027 ` has a trailing space; division headers are styled `<th
   colspan="4">` rows interleaved in the same table.
7. Custom Drupal module markup (`soe-classes-schedule-*` classes) is stable-looking but unversioned;
   a Drupal upgrade could change wrappers. Inline `style=` attributes on `<td>` suggest hand-rolled
   templates — match on classes and href patterns, not styles.

Fail-fast assertions for a scraper:
- Landing page: `<meta name="Generator" content="Drupal 9` present; all 10 expected dept slugs found;
  total course links ≥ 600.
- Dept page: exactly 1 `<table>`; `class="soe-classes-schedule-th"` present; quarter headers match
  `^(Fall|Winter|Spring|Summer) 20\d\d\s*$`; the four headers span one consistent AY (Fall Y,
  Winter/Spring/Summer Y+1); course-name cells have `class="soe-classes-schedule-course-name"`.
- Every section href matches `^/courses/[A-Za-z0-9]+/(Fall|Winter|Spring|Summer)\d{2}/[0-9A-Za-z]+$`
  and its embedded term equals the column's header term.
- Instructor lines match `^(Staff|.+ \([a-z][a-z0-9]*\))$`.
- Per-course page: history table header is `Year|Fall|Winter|Spring|Summer`; year cells match
  `^\d{4}-\d{2}$`.
- Alert if a dept page yields 0 courses or (outside summer) 0 sections.

---

## 6. Recommended scraping strategy

1. **One fetch of `/courses/`** → department list + canonical course hrefs + code/title for all ~734
   courses (this alone is a full SOE course inventory with correct URL casing).
2. **Ten fetches of `/courses/{dept}`** (am, bme, cmpm, cse, ece, game, hci, nlp, stat, tim) → the
   entire upcoming-AY plan: for each course, quarters offered, section counts, instructors, modality
   notes. ~11 requests total for the headline dataset; re-scrape a few times a year (watch for the AY
   flip and late summer additions).
3. **Per-course pages only on demand** (734 requests) if you want the 5-year offering/instructor
   history to compute "typically offered" statistics. Skip section pages — no added data.
4. Parse with BeautifulSoup (lenient). Walk the dept table linearly: track current division from
   `th[colspan=4]`; a `td.soe-classes-schedule-course-name` starts a course; the next `<tr>`'s four
   `<td>`s are Fall/Winter/Spring/Summer in header order.
5. Normalize codes as `PREFIX NUMBER+SUFFIX` uppercase for catalog joins.
6. Politeness: 1–2 s between requests, desktop UA. No robots-hostile behavior observed.

### Working curl commands (verified 2026-07-25)

```bash
UA='Mozilla/5.0 (X11; Linux x86_64)'
curl -sL -A "$UA" https://courses.engineering.ucsc.edu/courses/         # inventory (70 KB)
curl -sL -A "$UA" https://courses.engineering.ucsc.edu/courses/cse      # CSE AY plan (178 KB)
curl -sL -A "$UA" https://courses.engineering.ucsc.edu/courses/stat     # STAT AY plan (44 KB)
curl -sL -A "$UA" https://courses.engineering.ucsc.edu/courses/cse101   # course history (14 KB)
curl -sL -A "$UA" https://courses.engineering.ucsc.edu/courses/CSE12/Fall26/01   # section (7 KB)
curl -sL -A "$UA" https://courses.engineering.ucsc.edu/pre-reshaping-departments # legacy depts
# Hazard demo: both of these return HTTP 500 (not 404):
#   /courses/CSE101   (wrong case)      /courses/cse999   (nonexistent)
```
