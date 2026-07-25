# UCSC Pisa Class Search — Data Source Notes

Source: `https://pisa.ucsc.edu/class_search/index.php`
Investigated: 2026-07-25 (9 HTTP requests, all successful, no auth/cookies needed).

Pisa is a PHP front-end over PeopleSoft (Campus Solutions 9). All interaction goes
through a single endpoint, `index.php`, dispatched by an `action` form field:

| action | purpose |
|---|---|
| *(none, GET)* | search form page (contains all facet option lists inline) |
| `results` | run a search, return first `rec_dur` rows |
| `next` | return the page **after** offset `rec_start` (see Pagination) |
| `update_segment` | re-render with a new `rec_dur` (used by the page-size dropdown) |
| `detail` | class-detail page for one section |

No JavaScript is required for any of this; everything is server-rendered HTML.

---

## 1. The search form (GET)

```bash
curl -sS -A "Mozilla/5.0" "https://pisa.ucsc.edu/class_search/index.php" -o form.html
```

~25 KB. All `<select>` option lists are inline in the HTML (nothing is
AJAX-loaded), so the form page is the canonical place to enumerate facets.

### Term codes (`binds[:term]`, `#term_dropdown`)

89 options, newest first. **Range observed: `2268` = 2026 Fall Quarter down to
`2048` = 2004 Fall Quarter** (history starts mid-2004; 2004 Winter–Summer are absent).

Term-code math (standard PeopleSoft STRM for a 2000s school):

```
code = 2000 + (year - 2000) * 10 + quarter_digit
     = int("2" + str(year % 100).zfill(2) + str(quarter_digit))

quarter_digit: 0 = Winter, 2 = Spring, 4 = Summer, 8 = Fall
```

Examples: `2268` = Fall 2026, `2260` = Winter 2026, `2262` = Spring 2026,
`2264` = Summer 2026, `2088` = Fall 2008. Note Fall belongs to the *calendar*
year it starts in (Fall 2026 = 2268, not 2270).

### Registration status (`binds[:reg_status]`, `#reg_status`)

```html
<option value='O' >Open Classes</option><option value='all' >All Classes</option>
```

**Use `all` to get every class, not just open ones.** (`O` is the page default.)

### Subject (`binds[:subject]`, `#subject`)

79 subject codes as of 2026 (plus **two** empty-valued options: a blank one and
"All Subjects" — both `value=""`). **Empty string = all subjects**, confirmed
working (see §3). Current codes:

```
ANTH APLX AM ARBC ART ARTG ASTR BIOC BIOL BIOE BME CRSN CHEM CHIN CSP CLNI CMMU
CMPM CSE COWL CT CRES CRWN DANM EART ECON EDUC ECE ESCI ENVS FMST FILM FREN GIST
GCH GRAD GREE HEBR HIS HAVC HISC HCI HTEC ITAL JAPN JRLC KRSG LATN LALS LGST LING
LIT MSE MATH MERR METX MUSC NLP OAKS OCEA PHIL PBS PHYE PHYS POLI PRTR PSYC SCIC
SOCD SOCY SPAN SPHS STAT TIM STEV THEA UCDC VAST WRIT
```

Caution: subject codes have changed over the years (e.g. Fall 2008 results show
`AMS 3 - 01 Precalculus` where today's code is `AM`; `CSE` was historically
`CMPS`/`CMPE`). The form only lists *current* codes — another reason to scrape
with subject left empty rather than iterating this list for historical terms.

### Other facets

- `binds[:session_code]` (`#Session`): `""` All Sessions, `1` Regular Academic
  Session, `ED1`, `ED2`, `IND`, `5S1`, `5S2`, `S8W`, `S10` (summer sessions).
- `binds[:catalog_nbr_op]`: `=`, `contains`, `<=`, `>=` ; `binds[:catalog_nbr]` free text.
- `binds[:instr_name_op]`: `=`, `contains`, `begins` ; `binds[:instructor]` free text.
- `binds[:ge]` (`#ge`): `""`, `AH&I`, `C`, `CC`, `ER`, `IM`, `MF`, `PE-E`, `PE-H`,
  `PE-T`, `PR-C`, `PR-E`, `PR-S`, `SI`, `SR`, `TA`, `AnyGE` (= any GE requirement).
- `binds[:crse_units_op]`: `=` or `between`, with `crse_units_exact` / `crse_units_from` / `crse_units_to`.
- `binds[:days]`: `""`, `MTWR`, `MTWRF`, `MWF`, `MW`, `TWR`, `TR`, `M`, `T`, `W`, `R`, `F`.
- `binds[:times]`: `""`, `Morning`, `Afternoon`, `Evening`, or exact slots like `08:00AM09:05AM`.
- `binds[:acad_career]`: `""`, `UGRD`, `GRAD`.
- Instruction-mode checkboxes (include mode when present): `binds[:asynch]=A`,
  `binds[:hybrid]=H`, `binds[:synch]=S`, `binds[:person]=P`. **Send all four**
  to include every instruction mode.

---

## 2. Results page (`action=results`)

### Known-working request (all classes, whole term, one page)

```bash
curl -sS -A "Mozilla/5.0" "https://pisa.ucsc.edu/class_search/index.php" \
  --data-urlencode "action=results" \
  --data-urlencode "binds[:term]=2268" \
  --data-urlencode "binds[:reg_status]=all" \
  --data-urlencode "binds[:subject]=" \
  --data-urlencode "binds[:catalog_nbr_op]==" \
  --data-urlencode "binds[:catalog_nbr]=" \
  --data-urlencode "binds[:title]=" \
  --data-urlencode "binds[:instr_name_op]==" \
  --data-urlencode "binds[:instructor]=" \
  --data-urlencode "binds[:ge]=" \
  --data-urlencode "binds[:crse_units_op]==" \
  --data-urlencode "binds[:crse_units_from]=" \
  --data-urlencode "binds[:crse_units_to]=" \
  --data-urlencode "binds[:crse_units_exact]=" \
  --data-urlencode "binds[:days]=" \
  --data-urlencode "binds[:times]=" \
  --data-urlencode "binds[:acad_career]=" \
  --data-urlencode "binds[:asynch]=A" \
  --data-urlencode "binds[:hybrid]=H" \
  --data-urlencode "binds[:synch]=S" \
  --data-urlencode "binds[:person]=P" \
  --data-urlencode "rec_start=0" \
  --data-urlencode "rec_dur=2000" \
  -o results.html
```

For Fall 2026 this returned all 1,501 rows in one ~5.8 MB response in a few seconds.

### Result-count line (fail-fast marker)

```html
<b>1</b> - <b>25</b> of <b>1501</b> <a href = "index.php" onclick = "document.resultsForm...
```

Regex: `<b>(\d+)</b> - <b>(\d+)</b> of <b>(\d+)</b>`. Assert that group 3 equals
your parsed row count when fetching in one page.

### Per-class row structure

Each class is one panel, `div.panel.panel-default.row` with `id="rowpanel_N"`
(N = 0-based index on the page). Real excerpt (trimmed):

```html
<div class="panel panel-default row" ... id="rowpanel_0">
   <form action="index.php" id="detail_form_0" method="post">
        <input type="hidden" name="action" value="detail">
        <input type="hidden" name="class_data[:STRM]" value="2268">
        <input type="hidden" name="class_data[:CLASS_NBR]" value="12222">
        ... (all binds echoed) ...
   </form>
   <div class="panel-heading panel-heading-custom"><H2 style="margin:0px;">
     <img src=".../PS_CS_STATUS_OPEN_ICN_1.gif" alt="Open" title="Open" ...>
     <a id="class_id_12222" href="index.php?action=detail&amp;class_data=YToyOntz...30%3D">
       AM 3 - 01&nbsp;&nbsp;&nbsp;Precalculus</a>
   </H2></div>
   <div class="panel-body" ...>
     <div class="col-xs-6 col-sm-3">Class Number: <a id="class_nbr_12222" href="...">12222</a> </div>
     <div class="col-xs-6 col-sm-3"><i class="fa fa-user" ...></i><i class="sr-only">Instructor:</i> Dey,P.</div>
     <div class="col-xs-6 col-sm-6"><i class="sr-only">Location:</i> LEC: N. Sci Annex 101</div>
     <div class="col-xs-6 col-sm-6"><i class="sr-only">Day and Time:</i> MWF 01:20PM-02:25PM  </div>
     <div class="col-xs-6 col-sm-3"> 28 of 80 Enrolled</div>
     <div class="col-xs-6 col-sm-3 hide-print"><a href="https://ucsc.textbookx.com/classes/12222-2268" ...>Textbooks</a></div>
     <div class="col-xs-6 col-sm-3 hide-print"><i class="sr-only">Instruction Mode:</i><b>In Person</b></div>
   </div>
</div>
```

Field-by-field:

- **Status**: `<img ... alt="X">` in the panel heading. Observed alts (Fall 2026):
  `Open` (989), `Closed` (222), `Closed with Wait List` (293). Icon filenames:
  `PS_CS_STATUS_{OPEN,CLOSED,WAITLIST}_ICN_1.gif`.
- **Course code + title**: heading link text, format
  `SUBJ CATNBR - SECT&nbsp;&nbsp;&nbsp;ShortTitle` (e.g. `CSE 101 - 01   Intro Data Structures`).
  Split on the triple `&nbsp;`. Section is 2 digits (`01`, `01A` style suffixes
  appear only on discussion sections listed in detail pages). Titles here are the
  *short* PeopleSoft title; the detail page has the long title.
- **Class number** (unique 5-digit enrollment number, per term): both the heading
  link id (`class_id_12222`) and the `class_data[:CLASS_NBR]` hidden input and
  the "Class Number:" link (`class_nbr_12222`). Prefer the hidden input.
- **Instructor**: text after `<i class="sr-only">Instructor:</i>` (see §6).
- **Location**: `TYPE: Room` where TYPE ∈ LEC/DIS/LAB/SEM/STU/FLD... ; can be
  bare `FLD` (no room) or `LEC: Online`, `FLD: Online`.
- **Day/Time**: e.g. `MWF 01:20PM-02:25PM`, `TuTh 09:50AM-11:25AM`; can be empty,
  a bare day, or the literal string `Cancelled Cancelled` for cancelled sections.
- **Enrollment**: text ` 28 of 80 Enrolled` (regex `(\d+) of (\d+) Enrolled`;
  present on all 1,501 rows).
- **Instruction Mode**: `<b>` after the sr-only label. Observed values:
  `In Person`, `Asynchronous Online`, `Synchronous Online`, `Hybrid`.
- **Detail link**: `index.php?action=detail&class_data=<b64>` where `<b64>` is
  base64 of a PHP-serialized array:
  `a:2:{s:5:":STRM";s:4:"2268";s:10:":CLASS_NBR";s:5:"12222";}` — trivially
  constructible for any (term, class_nbr) pair. Beware: the heading link is
  single-URL-encoded (`%3D`), but the "Class Number" link is *double*-encoded
  (`%253D`) and only works because the server is lenient. Build your own from
  the two hidden inputs instead of scraping either href.

### Pagination

- `rec_dur` (page size): dropdown offers 10/25/50/100, but **arbitrary values are
  honored** — `rec_dur=2000` returned all 1,501 rows. Upper bound untested beyond
  2000; a whole UCSC quarter is ~1,500–1,700 sections so 2000–3000 is plenty.
- `rec_start` is **ignored by `action=results`** (tested `rec_start=1475` → still
  returned rows 1–25). To page, use `action=next` with all the same binds:
  it returns rows starting at `rec_start + rec_dur + 1`. Tested:
  `action=next, rec_start=50, rec_dur=25` → `76 - 100 of 1501`, and the returned
  page's hidden `rec_start` is `75`. I.e. the semantics are "the page after the
  page that began at rec_start+1". To fetch rows N..N+D-1 (1-based):
  `action=next`, `rec_dur=D`, `rec_start=N-1-D`.
- Every results page echoes the full search state as hidden inputs in
  `form#resultsForm`, so paging is stateless — no cookies needed.
- **Recommendation: skip pagination entirely; one `action=results` request with
  `rec_dur` ≥ total is simplest and verifiable against the count line.**

### Zero-results marker

A search with no matches has **no** count line and **no** `rowpanel_` divs;
instead the body contains:

```html
<p>Sorry. Your search:<br>
```

Distinguish "0 results" from "page format changed" by asserting on this string.

---

## 3. Getting ALL classes for a term

Empty `binds[:subject]` + `binds[:reg_status]=all` + all four mode flags returns
everything in one query — no need to iterate subjects (and iterating subjects is
actively wrong for historical terms, since old subject codes aren't in today's
dropdown). Measured totals:

| term | code | total sections |
|---|---|---|
| Fall 2026 | 2268 | **1,501** |
| Fall 2008 | 2088 | **1,542** |

So: **one POST per term** (`rec_dur=3000`), ~6 MB HTML, then one detail fetch per
section only if you need descriptions/prereqs (1,500 requests per term — spread
these out; see §5).

Note: results rows are *primary* sections (lectures, seminars, etc.).
Discussion/lab sub-sections (with their own 5-digit class numbers) appear only
inside the parent's detail page under "Associated Discussion Sections or Labs".

---

## 4. Class-detail page (`action=detail`)

Works as a plain GET (no session state needed):

```bash
CLASS_DATA=$(printf 'a:2:{s:5:":STRM";s:4:"2268";s:10:":CLASS_NBR";s:5:"12222";}' | base64 -w0)
curl -sS -A "Mozilla/5.0" \
  "https://pisa.ucsc.edu/class_search/index.php?action=detail&class_data=$(python3 -c "import urllib.parse,os;print(urllib.parse.quote('$CLASS_DATA'))")"
```

(Adjust the `s:5:"12222"` length field if the class number isn't 5 chars.)
Alternatively POST `action=detail&class_data[:STRM]=2268&class_data[:CLASS_NBR]=12222`.

Panels present (each a `div.panel-heading.panel-heading-custom` `<h2>` followed by
a body; optional panels are omitted when empty):

1. **Header**: long title — `AM 3 - 01   Precalculus for the Social Sciences`,
   term name, textbook link.
2. **Class Details** — a `<dl>` of `<dt>/<dd>` pairs:
   `Career` (Undergraduate/Graduate), `Grading` (e.g. Student Option),
   `Class Number`, `Type` (Lecture/Seminar/...), `Instruction Mode`,
   `Credits` ("5 units"), `General Education` (e.g. "MF"), `Status`,
   `Available Seats`, `Enrollment Capacity`, `Enrolled`,
   `Wait List Capacity`, `Wait List Total`.
   Real excerpt (note the stray `</span>` — the HTML is invalid; use a lenient parser):
   ```html
   <dt>Class Number</dt><dd>12222</dd>
   ...
   <dt>Available Seats</dt><dd>52</span></dd>
   ```
3. **Description** — full catalog description (paragraph text).
4. **Enrollment Requirements** — **this is the prerequisite text**, e.g.
   `Prerequisite(s): score of 200 or higher on the mathematics placement
   examination (MPE), or MATH 2.` Free text; also carries concurrent-enrollment
   and "Enrollment is restricted to..." clauses.
5. **Class Notes** — free text (e.g. "Enroll in lecture and associated discussion section.").
6. **Meeting Information** — table with columns `Days & Times`, `Room`,
   `Instructor`, `Meeting Dates` (e.g. `09/24/26 - 12/04/26`). Multiple rows for
   multi-pattern classes.
7. **Associated Discussion Sections or Labs** — repeated blocks per sub-section:
   `#10203 DIS 01A`, day/time, instructor, `Loc: Engineer 2 194`,
   `Enrl: 22 / 40`, `Wait: 0 / 999`, status word (Open/Closed/Wait List).

The detail page is the only place with: description, prereq text, class notes,
grading basis, exact seat/waitlist numbers, meeting dates, and sub-sections.

---

## 5. Stability & hazards

- **No cookies or session required.** The server sets `PHPSESSID` and AWS ALB
  cookies (`AWSALB`/`AWSALBCORS` — the site sits behind an AWS load balancer),
  but every request in this investigation was made cookie-less and stateless and
  worked, including detail GETs and `action=next` paging.
- **No rate limiting observed** across 9 requests at 1–2 s spacing, including a
  5.8 MB full-term dump. Still, for the ~1,500 detail fetches per term keep ≥1 s
  spacing and set a real browser `User-Agent` (plain `curl/8` UA was not tested;
  a browser UA is known-good).
- **Malformed HTML**: stray `</span>` closers inside `<dd>` elements; uppercase
  `<H2>`; inconsistent URL-encoding (double-encoded `%253D` in one of the two
  detail links). Use html5lib/lxml-recover, not a strict parser.
- **`rec_start` trap**: silently ignored by `action=results` — you always get
  page 1. If you paginate you *must* use `action=next` (with its off-by-one
  semantics). Prefer one big `rec_dur` request.
- **Historical subject codes** differ from the current dropdown (AMS→AM,
  CMPS/CMPE→CSE, etc.). Course-code strings in old terms will not match current
  subject lists.
- **Duplicate empty options**: the subject select has two `value=""` options.
- The `class_data` blob is PHP `serialize()` output — if UCSC ever upgrades this
  app the format could change; the POST form (`class_data[:STRM]`,
  `class_data[:CLASS_NBR]`) is the more semantic interface.
- Waitlist capacity `999` is a sentinel for "unlimited", effectively.
- `binds[:title]` etc. all echo into the page — output appears escaped, but treat
  the echoed-binds region as noise when parsing.

### Fail-fast assertions for a scraper

1. Results page: count line matches `<b>1</b> - <b>(\d+)</b> of <b>(\d+)</b>` and
   number of `id="rowpanel_\d+"` divs equals (group1) and, for single-page dumps,
   equals (group2 total). If the count line is absent, require the
   `Sorry. Your search:` marker; otherwise abort.
2. Every rowpanel contains exactly one `class_data[:CLASS_NBR]` hidden input and
   one `a[id^=class_id_]` whose id suffix equals that value.
3. Heading text splits into exactly 2 parts on `\xa0\xa0\xa0` (the triple
   `&nbsp;`), and part 1 matches `^[A-Z]+ \S+ - \d+\w*$`.
4. Detail page: `<h2>` panels include `Class Details`; the `<dl>` contains
   `<dt>Class Number</dt>` whose `<dd>` equals the requested class number.
5. Form page (for term discovery): `id = "term_dropdown"` present and its first
   option value matches `^2\d{3}$`.

---

## 6. Instructor data quality

- Format: `Last,F.M.` — surname, comma, **no space**, then initials with periods
  (e.g. `Dey,P.`, `Abrams,E.S.`, `Alexandradinata,A.`). Multi-word surnames keep
  internal spaces: `Alfaro Cordoba,M.`. You get initials only, never full first
  names, in the results list; the detail Meeting Information table uses the same
  format.
- **`Staff` placeholder**: literal string `Staff` when unassigned — 275 of 1,501
  Fall 2026 rows (~18%). Discussion/lab sub-sections are very frequently `Staff`.
- **Multiple instructors**: separated by `<br>` inside the same instructor div
  (30 of 1,501 rows), e.g. `Tsing,A.L.<br>Gutierrez,K.`. Parse the div's inner
  HTML and split on `<br>`, not the text content.
- Matching instructors across terms by `Last,F.M.` is lossy (collisions,
  marriage-name changes); treat as display strings, not identities.

---

## 7. Recommended scraping strategy

1. **Term discovery**: GET the form page; parse `#term_dropdown` options
   (assert marker 5). Don't hard-code the list — but the code math in §1 lets you
   generate expected codes for validation.
2. **Per term (one request)**: POST `action=results` with `reg_status=all`,
   empty subject, all four mode flags, `rec_dur=3000`. Assert markers 1–3.
   This yields class number, course code, section, short title, status,
   instructor(s), location, meeting pattern, enrolled/capacity, mode.
3. **Per section (optional, one request each)**: GET `action=detail` built from
   (STRM, CLASS_NBR) for description, prereq text ("Enrollment Requirements"),
   notes, seats/waitlist, meeting dates, and DIS/LAB sub-sections. Cache
   aggressively; descriptions/prereqs rarely change within a term. For a
   prereq-focused app you can fetch details for only one section per course code.
4. Politeness: ≥1 s between requests, browser UA, retry-with-backoff on non-200
   or on fail-fast assertion misses (transient ALB errors are conceivable).
5. Re-scrape cadence: enrollment counts churn constantly during enrollment
   periods; catalog-ish fields (title/description/prereqs) are stable per term.
