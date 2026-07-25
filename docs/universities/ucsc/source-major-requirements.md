# UCSC Catalog — Academic Program (Major) Requirement Pages

**Source root:** `https://catalog.ucsc.edu/en/current/general-catalog/academic-programs`
**Surveyed:** 2026-07-25 (catalog year "current"; ~13 polite curl requests)
**Platform:** SmartCatalog IQ (Watermark) — confirmed via `cdn-prod.smartcatalogiq.com/catalog/bundle.js`, `sc-*` CSS classes, and a generic smartcatalogiq `robots.txt`.

Pages fetched and deeply analyzed: Computer Science B.S., Computer Engineering B.S., Mathematics B.S., Economics B.A., Literature B.A., Computer Science Minor, plus the bachelor's and minors index pages.

---

## 1. Program enumeration

### Index pages

| Index | URL | Count |
|---|---|---|
| Bachelor's degrees | `.../academic-programs/bachelors-degrees` | **75** |
| Undergraduate minors | `.../academic-programs/undergraduate-minors` | **44** |
| Also present | `masters-degrees`, `phd-degrees`, `designated-emphases`, `bachelors-masters-contiguous-pathways`, `fields-of-study-chart` | — |

Degree-type breakdown of the 75 bachelor's programs (from the link anchor text, which always ends with the degree suffix): **47 B.A., 27 B.S., 1 B.M.** (Music B.M.). Do not hardcode BA/BS only.

### One page per program — yes

Each program (each degree variant, each combined major) has exactly one page. Combined majors (e.g., "Economics/Mathematics Combined B.A.") are separate pages, not sections of a parent page.

### URL pattern

```
/en/current/general-catalog/academic-units/{division-slug}/{department-slug}/{program-slug}
```

- `{division-slug}` ∈ `arts-division`, `baskin-engineering`, `humanities-division`, `physical-and-biological-sciences-division`, `social-sciences-division` (5 divisions for undergrad programs).
- `{program-slug}` normally ends in `-ba`, `-bs`, `-bm`, or `-minor`.
- The bachelor's index links carry anchor text = official program name incl. degree ("Computer Science B.S.").

**Slug hazards (real examples — never derive names from slugs):**

- `copy-of-physics-bs` — the *live* Physics B.S. page has a CMS artifact slug.
- Department dir `copy-of-global-and-community-health-bs-pbsci` for Global and Community Health B.S.
- Combined majors concatenate names with **no separator**: `environmental-studieseconomics-combined-major-ba`, `latin-american-and-latino-studiessociology-combined-ba`.
- Name/slug divergence: "Ancient Studies Minor" lives at `classical-studies-minor`.

Enumeration recipe: fetch the index page, extract `<a href="/en/current/general-catalog/academic-units/...">` pairs (75 exactly today), take name + degree from anchor text.

---

## 2. Page anatomy (majors)

All five sampled majors share the same two-part skeleton:

```
h1  {Program Name} {Degree}
h2  Information and Policies
    h3 Introduction / Program Learning Outcomes / Academic Advising ...
    h3 Transfer Information and Policy
       h4 Transfer Admission Screening Policy        ← course tables + GPA prose
    h3 Major Qualification Policy and Declaration Process
       h4 Major Qualification                        ← course tables + GPA prose
       h4 Appeal Process / How to Declare a Major
    h3 Letter Grade Policy / Course Substitution Policy / Honors / ...
h2  Requirements and Planners
    h3 Course Requirements
       h4 Lower-Division Courses
       h4 Upper-Division Courses
       h4 Electives                                  (some majors)
       h4 Disciplinary Communication (DC) Requirement
       h4 Comprehensive Requirement
    h3 Planners                                      (quarter-by-quarter tables)
```

### The `sc-*` class system (the real parsing anchor)

Requirement-group headings are *classed*, and the class level is what's semantically stable (h-levels shift between majors/minors):

| Class | h-level (majors) | h-level (minors) | Role |
|---|---|---|---|
| `sc-RequiredCoursesHeading1` | h3 | h3 | Section (Course Requirements / Concentration) |
| `sc-RequiredCoursesHeading2` | h4 | h4 | Division block (Lower-Division, DC, Electives) |
| `sc-RequiredCoursesHeading3` | h5 | — | Rule group ("Plus one of the following") |
| `sc-RequiredCoursesHeading4` | h6 | — | Nested rule group / named elective list |
| `sc-coursenumber` / `sc-courselink` / `sc-coursetitle` | table cells | same | Course row parts |
| `sc-crosslisted` | div inside coursenumber cell | same | e.g. `/CSE 185S` |
| `sc-requirementsNote` | div | same | Substitutions, exceptions, double-count bans |
| `sc-BodyText` | p | — | Prose |

In **minors**, the whole hierarchy is shallower: `h2 Course Requirements` sits at the top (no "Information and Policies"), and rule-group headings ("Plus one of the following") appear at `sc-RequiredCoursesHeading2`/h4. **Parse by class + document order, not by absolute h-level or fixed class→role mapping.**

### Course rows (fully structured — parse deterministically)

```html
<h6 class="sc-RequiredCoursesHeading4">All of the following</h6>
<table>
  <tr>
    <td class="sc-coursenumber"><a class="sc-courselink"
        href="/en/current/general-catalog/courses/cse-computer-science-and-engineering/lower-division/cse-12">CSE 12</a></td>
    <td class="sc-coursetitle">Computer Systems and Assembly Language and Lab</td>
    <td><p class="credits">7</p></td>
  </tr>
  ...
</table>
```

- Course code text is **always the abbreviated form** (`CSE 12`, `MATH 11A`, `ECON 197`) — never spelled-out department names. Codes are `SUBJ␣NUM[letter-suffix]` (`CSE 13S`, `CSE 185E`, `PHYS 5M`, `CSE 110B`).
- The `href` slug (`.../cse-computer-science-and-engineering/lower-division/cse-12`) is a canonical ID and also encodes subject + lower/upper division — more reliable than text.
- Credits cell is numeric or **empty** (empty on narrative pseudo-rows, below).
- Cross-listings render as a `<div class="sc-crosslisted">/CSE 185S</div>` **inside the coursenumber cell** — strip it or it corrupts the code.

### Narrative pseudo-rows: OR-groups *inside* tables

Option groups ("either sequence A or sequence B") are encoded as fake course rows whose link points into `narrative-courses` and whose coursenumber text is empty:

```html
<h5 class="sc-RequiredCoursesHeading3">Plus one of the following options</h5>
<table>
  <tr><td class="sc-coursenumber"><a class="sc-courselink"
       href="/en/current/general-catalog/courses/narrative-courses/either-these-courses"> </a></td>
      <td class="sc-coursetitle">Either these courses</td><td><p class="credits"></p></td></tr>
  <tr> ... PHYS 5B ... </tr>
  <tr> ... PHYS 5M ... </tr>
  <tr><td class="sc-coursenumber"><a class="sc-courselink"
       href="/en/current/general-catalog/courses/narrative-courses/or-this-course"> </a></td>
      <td class="sc-coursetitle">or this course</td><td><p class="credits"></p></td></tr>
  <tr> ... ECE 9 ... </tr>
</table>
```

Observed variants across 6 pages: `either-these-courses` (×6), `or-these-courses` (×9), `or-this-course` (×2). Semantics: rows between narrative markers form an AND-branch; branches are OR'd. A naive "every `<tr>` is a course" parser silently merges alternatives into one required list — the single worst failure mode on this site.

### Empty tables everywhere

The CMS emits `<table></table>` (whitespace only) between nearly every heading pair — 18–57 empty tables per page. Filter tables with zero `<tr>` before doing anything positional.

---

## 3. Requirement-rule taxonomy (basis for the structured schema)

Every rule = a classed heading (or note/prose) + an optional course table. Observed shapes:

1. **ALL_OF** — heading text: "All of the following", "Take the following courses:", "Plus all of the following", "Plus both of these courses:", "The following course", "Plus the following course:". Table = required list.
2. **ONE_OF** — "One of the following courses:", "Choose one of the following courses:", "Plus one of the following", "And one of these (whichever is completed first):", "Take one of the following:". Table = alternatives.
3. **OPTION_GROUPS (OR of sequences)** — heading "…one of the following options" + narrative pseudo-rows partitioning the table into AND-branches (Econ math options: AM 11A+11B *or* MATH 11A+11B+…; CE physics option above).
4. **N_OF / COUNT_FROM_LIST** — count lives in **heading or prose**, list in table(s):
   - Economics B.A.: h5 "Plus five economics electives:" + prose: *"At least three courses must come from the General Economics Electives list. No more than two courses may come from the Finance Electives list. No more than one course may come from the Business Management Electives."* — then three h6-named sub-lists. (Count + per-sublist min/max constraints.)
   - CS B.S. Electives: *"Four courses must be completed from the list below. At least one course must be a computer science and engineering course. At most two courses can be from applied mathematics, statistics or mathematics, of which at most one may be substituted with two physics classes, chosen from the following list of class pairs: PHYS 6A and 6C, …"* — count + category caps + pair-substitution rule, all prose.
5. **RANGE_RULE / CATEGORY_COUNT (no explicit list)** — Literature: *"Students take seven 5-credit upper-division electives chosen from LIT 109-189, excluding courses LIT 179A and LIT 179B…"* (numeric course-code range + exclusions); CS minor: "Plus two upper-division computer science and engineering courses"; CE concentrations: "Plus one upper-division or graduate elective" (no table at all).
6. **DISTRIBUTION** — Literature h6 "Distribution Requirements": a plain `<ul>` of prose buckets ("Two courses on literature written before 1750", "One course on poetry and poetics"), with the qualifying-course mapping only on an **external page** (`.../literature/distribution-requirement-course-lists/`) and the department website. One course may satisfy multiple buckets.
7. **TRACKS / CONCENTRATIONS** — two different layouts:
   - **CE B.S.**: h3 "Course Requirements (all concentrations)" (shared core) + h3 "Concentration Courses" containing four h4 concentration blocks (Computer Systems, Digital Hardware, Networks, System Programming), each with its own rule groups.
   - **Literature B.A.**: three *top-level h2 sections* ("General Literature Concentration", "Language Literature Concentration", "Creative Writing Concentration"), each a full copy of Course Requirements + DC + Comprehensive + Planners, plus per-concentration "Intensive Option" add-ons. A parser assuming one "Requirements and Planners" h2 per page breaks here.
8. **CAPSTONE / COMPREHENSIVE** — always an h4 "Comprehensive Requirement". CS B.S.: prose OR (capstone course from list, or senior thesis CSE 195), plus double-count notes. **CE B.S. expresses the OR as sibling h6 headings**: "Both of the following courses" / "Or all of the following courses" / "Or the following course" — the disjunction lives in *heading text across siblings*, a third distinct OR encoding.
9. **DC REQUIREMENT** — always its own h4 heading. Usually ONE_OF with a table (CS: CSE 115A, 185E/185S, 195…; Math: "Plus one of the following courses:"); sometimes satisfied implicitly by a core course and stated in prose only. Economics additionally embeds the DC choice inside Upper-Division ("Plus one of the following disciplinary communication (DC) courses:").
10. **QUALIFICATION / DECLARATION / GPA** — under "Major Qualification" and "Transfer Admission Screening Policy": course tables using the same rule-group grammar, plus GPA **in prose only** (e.g., CS: h5 "Minimum GPA", "Cumulative GPA" headings with thresholds like 3.0 in the paragraph text). No structured GPA markup anywhere.
11. **NOTES / EXCEPTIONS** (`sc-requirementsNote`) — substitutions, AP/test-out alternatives, sequencing ("Students with no prior programming will take CSE 20 before CSE 30"), and double-count bans: *"CSE 195 may be used either as an elective, or to satisfy the DC requirement, but not for both."* These modify adjacent rules and must be attached to them.

### Heading-text grammar

The rule operator is carried by semi-controlled heading phrases. Observed vocabulary (non-exhaustive — treat as open set): `All of the following`, `Take the following courses:`, `The following course`, `Plus/And one of the following (courses|options)`, `Choose one of the following courses:`, `Plus both of these courses:`, `Plus all of the following (courses)`, `And one of these (whichever is completed first):`, `Plus five economics electives:`, `Students should complete at least six of the following`, `Plus at least one of the following`, `Or all of the following courses`, `Or the following course`. Free-text enough that regex-only classification will leak; ideal small-LLM classification target.

---

## 4. Consistency verdict & hazards

**Verdict: unusually consistent.** All 5 majors + 1 minor use the identical `sc-*` template; course codes are uniform abbreviated form; rule groups are heading+table pairs. This is a top-quartile source. But:

**Hazard catalog (things that break naive parsing):**

1. Narrative pseudo-rows (`narrative-courses/*`) — OR-branches inside tables; empty code cell, empty credits. Unknown future variants possible (assert on the known set).
2. OR is expressed **three different ways**: heading text ("one of the following"), narrative rows (option sequences), and sibling headings ("Or all of the following courses" — CE capstone). Plus inline prose "(or PHYS 15A)".
3. Counts and caps live in prose (`five electives`, `at least three from list X`, `no more than two`, pair-substitutions). Numbers as words, not digits.
4. Empty `<table></table>` spam between headings (up to 57/page).
5. `sc-crosslisted` div nested inside the course-number cell.
6. Literature: per-concentration h2 clones of the entire requirements block; range rules ("LIT 109-189, excluding…"); distribution buckets resolvable only via an **external course-list page / department website**.
7. Heading-level semantics shift: same class ↦ different meaning in majors vs minors; requirement depth varies (CS uses Heading4 for rule groups; CE mostly Heading3).
8. Qualification/screening sections reuse the same course-table markup as degree requirements — a scraper grabbing "all course tables" conflates declaration prerequisites with major requirements. Segment by the two h2 sections first.
9. Slug artifacts: `copy-of-physics-bs`, `copy-of-...-pbsci`, concatenated combined-major slugs, `classical-studies-minor` ≠ Ancient Studies.
10. Some rules have **no table** ("Plus one upper-division or graduate elective").
11. Planners section repeats every course again in scheduling tables — must be excluded from requirement extraction or courses double-count.
12. Degree types include B.M.; combined majors exist as independent programs.
13. Prose course mentions are usually also `sc-courselink`-wrapped (good), but relying on links inside `sc-requirementsNote` will pull in *conditional* courses (AP alternatives, sequencing) as if required.

---

## 5. Machine-readable alternatives — effectively none

- `sitemap.xml` / arbitrary 404s return a JS fallback page (client-side redirect logic), which leaks `/Institutions/University-of-California-Santa-Cruz/json/Current.json` — but that file is only `[{"Catalog":"general-catalog","Year":"2019-2020"}]` (a legacy-URL year map). Not a data feed.
- `robots.txt` is the stock smartcatalogiq.com file (no sitemap directive).
- Print view is `javascript:window.print()` — no separate print URL.
- No JSON/XML program API discovered; page HTML is server-rendered (curl gets full content, no JS needed — good).
- Practical upshot: **the HTML *is* the API**, and the `sc-*` classes make it a de-facto semi-structured format. The `fields-of-study-chart` page can serve as an independent cross-check of the program list.

---

## 6. Minors

- **44 minors**, same URL pattern (`.../{dept}/{slug}-minor`), same `sc-*` markup.
- Simpler skeleton: `h1` title → `h2 Course Requirements` → `h3 Lower-Division / Upper-Division Courses` → rule-group headings at `sc-RequiredCoursesHeading2` (h4). No Information and Policies, no DC/Comprehensive sections, typically no planners.
- Same rule shapes appear (ONE_OF options, category counts: "Plus two upper-division computer science and engineering courses from the following…").
- One scraper can handle both if it is class-driven and order-driven rather than level-driven.

---

## 7. Fail-fast assertions for the scraper

Index level:
- Bachelor's index yields **70–85** `academic-units` program links (75 today); every anchor text ends `B.A.|B.S.|B.M.`; every slug matches `-(ba|bs|bm)$`.
- Minors index yields **38–50** links (44 today), slugs end `-minor`.

Per program page:
- Exactly one `<h1>`; h1 text contains the degree suffix from the index.
- ≥1 heading whose text is `Course Requirements` (majors also: `Requirements and Planners` h2 — except verify Literature-style multi-concentration pages, where `Course Requirements` appears once per concentration h2).
- Majors: headings `Disciplinary Communication` and `Comprehensive Requirement` present (true on all 5 sampled).
- ≥1 non-empty course table; every `sc-coursenumber` link href starts `/en/current/general-catalog/courses/`.
- Course-code text matches `^[A-Z]{2,4} \d{1,3}[A-Z]{0,2}$` after stripping `sc-crosslisted`; alert on mismatch.
- Every `narrative-courses/{x}` slug ∈ {`either-these-courses`, `or-these-courses`, `or-this-course`} — **hard-fail on a new variant** (it changes OR semantics).
- Credits cell: integer 1–15 or empty; empty only on narrative rows (else warn).
- `sc-RequiredCoursesHeading{1..4}` classes are the only heading classes seen in requirement zones; unseen `sc-` class ⇒ warn.
- Page size sanity: sampled pages 54–124 KB.

---

## 8. Recommended LLM-pipeline strategy

**Deterministic (no LLM):**
1. Enumerate programs from the two index pages (name, degree, division, dept, slug, URL).
2. Segment each page into a heading tree keyed by `sc-RequiredCoursesHeading*` class + document order; split majors at the h2 boundary (`Information and Policies` vs `Requirements and Planners`, or per-concentration h2s); drop `Planners` subtrees.
3. Extract course rows: `(code, title, credits, canonical_href, crosslisted[])`; drop empty tables; convert narrative pseudo-rows into branch delimiters, yielding `options: [[courses...], [courses...]]` mechanically.
4. Attach adjacent `sc-requirementsNote` divs and inter-table `<p>` prose to their rule node verbatim.

**Small-LLM tasks (feed one rule node = heading + prose + already-extracted course list; ask for a typed rule):**
1. Classify heading text → operator: `all_of | one_of | n_of | options`; extract N from heading/prose words ("five", "both"→2, "at least six of the following").
2. Parse prose constraint riders → structured caps: `{min_from: {list: General, n: 3}, max_from: {...}}`, pair-substitution rules, range rules (`LIT 109-189 excluding [179A, 179B]`), category-count rules ("two upper-division CSE courses").
3. Extract GPA/qualification facts from Major Qualification / Transfer Screening prose (`{gpa_min: 3.0, scope: "screening courses"}`).
4. Flag `needs_external_resolution` for distribution lists behind external links (Literature) rather than hallucinating memberships.

**Suggested rule-node schema (matches observed taxonomy):**
```
Rule = { op: all_of|one_of|n_of|options|category_count|range|distribution|external,
         n?: int, courses?: [CourseRef], branches?: [[CourseRef]],
         from_lists?: {name -> [CourseRef]}, constraints?: [Constraint],
         source: {heading, prose, html_span}, notes: [text] }
Section = { kind: lower_div|upper_div|electives|dc|comprehensive|qualification|screening|concentration,
            concentration?: name, rules: [Rule] }
```
Keep the raw heading/prose in every node — the deterministic layer is trustworthy for *membership*, the LLM only decides *combinators and counts*, and both are auditable against the stored source span.

**Validation loop:** after LLM normalization, assert every course extracted deterministically is referenced by exactly one rule (or an explicit note), and that each Section has ≥1 rule; diff per catalog year via `Last-Modified`/ETag (pages served from S3/CloudFront with etags).
