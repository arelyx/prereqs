# Data Source: UC Davis General Catalog — Course Pages (preliminary)

- **Root:** `https://catalog.ucdavis.edu/courses-subject-code/` (subject index) → per-subject pages `https://catalog.ucdavis.edu/courses-subject-code/<subj>/` (e.g. `ecs`, `mat`)
- **Platform:** CourseLeaf (Leepfrog) — server-rendered HTML, no JS needed for course content (`courseleaf` assets in page source)
- **Verified live:** 2026-07-25 (9 polite curl requests). Current edition = **2026-2027 UC Davis General Catalog** (footer/meta on every page).
- **Status:** preliminary research + prototype fetch only (`pipelines/ucdavis/catalog_courses/fetch.py`). Not integrated; no LLM stage.
- UC Davis is on the **quarter system** (like UCSC), so the normalized `term_system` and season vocabulary carry over unchanged.

---

## 1. How courses are listed

One page per **subject code**, not per department. The index page lists **227 subject links** as `href="/courses-subject-code/<slug>/"` with anchor text `Aerospace Science & Engineering (EAE)` — slug is the lowercase subject code, anchor text carries the human name + code. Counts observed: ECS 185 courses, MAT 148 courses — pages are large (~400 KB) but a single request per subject suffices.

Each course is one `div.courseblock`. Real excerpt (ECS 017, abridged):

```html
<div class="courseblock">
 <h3 class="cols noindent">
  <span class="text courseblockdetail detail-code ..."><b>ECS 017</b></span>
  <span class="text courseblockdetail detail-title ..."><b>— Data, Logic, &amp; Computing</b></span>
  <span class="text courseblockdetail detail-hours_html ..."><b>(4 units)</b></span>
 </h3>
 <div class="noindent"><p class="courseblockextra noindent"><em>Course Description:</em> Display, processing, and representation of information ...</p></div>
 <div class="noindent"><p class="text courseblockdetail detail-prerequisite"><i>Prerequisite(s): </i>MAT 016A (can be concurrent) or <a ... class="bubblelink code">MAT 017A</a> (can be concurrent) or ...</p></div>
 <div class="noindent notinpdf"><div class="courseblockextra noindent">
  <ul>
   <li><span class="label"><em>Learning Activities:</em></span> Lecture 3 hour(s), Discussion 1 hour(s).</li>
   <li><span class="label"><em>Credit Limitation(s):</em></span> Not open for credit to students who have completed course <a ...>ECS 020</a> or MAT108.</li>
   <li><span class="label"><em>Grade Mode:</em></span> Letter.</li>
   <li><span class="label"><em>General Education:</em></span> Science &amp; Engineering (SE); Quantitative Literacy (QL).</li>
  </ul>
 </div></div>
 <div hidden="true" class="noindent"> ... full duplicate of the labeled list ... </div>
</div>
```

## 2. Per-course fields

| Field | Selector | Deterministic? | Notes |
|---|---|---|---|
| Code | `h3 span.detail-code b` | **Yes** | `ECS 011`, `ECS 032AV`, `MAT 000B` — **numbers zero-padded to 3 digits**, up to 2 trailing letters. |
| Title | `h3 span.detail-title b` | **Yes** | Prefixed with an em-dash: `— Data, Logic, & Computing` — strip `— `. |
| Units | `h3 span.detail-hours_html b` | **Yes** | `(4 units)`, `(1-5 units)`, `(1 unit)` — parenthesized in the header, ranges common. |
| Description | `p.courseblockextra` whose text starts `Course Description:` | **Yes** | Strip the `<em>Course Description:</em>` label. |
| Prerequisite prose | `p.detail-prerequisite` | Structurally yes; **prose needs LLM** | Own labeled paragraph — cleaner separation than UCSC's mixed `Requirements` blob. Course mentions wrapped in `a.bubblelink` (same double-text hazard class as UCSC's `sc-courselink` if you walk descendants). |
| Labeled extras | `div.notinpdf li` with `span.label em` | **Yes (by label)** | Labels observed on ECS: `Learning Activities:` (185), `Grade Mode:` (185), `Enrollment Restriction(s):` (138), `General Education:` (89), `Repeat Credit:` (46), `Credit Limitation(s):` (31), `Cross Listing:` (4). |
| **GE codes** | extras label `General Education:` | **Yes** | `Science & Engineering (SE); Quantitative Literacy (QL)` — semicolon-separated `Name (ABBR)` pairs; extract the parenthesized abbreviations. Davis GE = campus-wide literacies (SE, SL, QL, AH, SS, VL, WC, WE, OL, ACGH, DD…). |
| Cross Listing | extras label `Cross Listing:` | **Yes** | e.g. ECS 012 → `CDM 012.` |
| Credit limitations / antireqs | extras label `Credit Limitation(s):` | prose (LLM) | `No credit for students that have taken ECS 111, …` — Davis puts antirequisites here, not in prereq prose. |
| Enrollment restrictions | extras label `Enrollment Restriction(s):` | prose (LLM) | Includes **Pass One/Pass Two registration-pass restrictions** (`Pass One restricted to Computer Science … majors only`), a concept UCSC has no analog for. |

## 3. Quirks / hazards

1. **Every labeled-extras list exists twice**: once visible in `div.noindent.notinpdf > div.courseblockextra > ul`, once in a `div[hidden="true"]` sibling (print/PDF variant). Parse only the `notinpdf` copy or you double-extract.
2. **Superseded course versions share one courseblock.** ECS 032B/036A blocks start their description with `This version has ended; see updated course, below.` and append a **second `<ul>`** containing an `<h5>` header (`ECS 036A — Programming & Problem Solving (4 units)`) plus `Course Description:` and ` Prerequisite(s):` (note leading space) as *list labels* for the updated version. A naive parse returns the outdated description/prereqs. Prototype flags these (`has_updated_version`); full support must parse the nested version.
3. **First course mention in prereq prose is often NOT linked** (`MAT 016A (can be concurrent) or <a>MAT 017A</a> …`) — never rely on `a.bubblelink` for code extraction; regex the text.
4. Concurrent-allowed marker varies: `(can be concurrent)` vs `{ can be concurrent }` on the same line (ECS 017, live).
5. Codes appear **unpadded and unspaced in prose** (`MAT108` in a Credit Limitation) while headers are padded (`MAT 000B`, `ECS 011`) — normalization must map `MAT108` ≡ `MAT 108` ≡ display `MAT 108`; store canonical without padding? Decide once: prototype normalizes by stripping leading zeros from the numeric part (`ECS011` → canonical `ECS11`? **No** — prototype keeps `ECS011` as-is and records the question; see §6).
6. `detail-*` classes on the subject pages are only `code|title|hours_html|prerequisite`; everything else lives in the labeled `<ul>`. Guard on unknown labels like UCSC's `KNOWN_EXTRA_LABELS`.
7. **Machine-friendly bonus endpoint:** `https://catalog.ucdavis.edu/ribbit/index.cgi?page=getcourse.rjs&code=ECS%20036A` returns the courseblock HTML wrapped in XML CDATA (200, verified) — standard CourseLeaf "ribbit" API; usable for spot re-fetches.

## 4. Edition scheme

- The live site serves only the current edition; every page footer says `2026-2027 General Catalog` / `2026-2027 UC Davis General Catalog`. Record that string per run (like UCSC's breadcrumb).
- Archived editions are **PDF dumps only** (`https://local-resources.ucdavis.edu/local_resources/docs/catalog/GenCat20252026.pdf`, back to 1999) — no pinnable archived HTML like UCSC's `/en/<year>/`. Historical HTML re-scrape is impossible; snapshot early, snapshot often.

## 5. Prerequisite prose style (real samples, verbatim)

1. `ECS 032C` — `ECS 032B C- or better.` — **minimum grade attached to nearly every code**, a pattern UCSC essentially never uses.
2. `ECS 036C` — `(ECS 040 C- or better or ECS 036B C- or better); ECS 020 C- or better.` — **parentheses for OR-groups, semicolon = AND** (UCSC uses bare `; and`).
3. `ECS 036A` — `ECS 032A C- or better or ECS 032AV C- or better or ECS 010 C- or better; or must satisfy computer science placement exam; prior experience with basic programming concepts (variable, loops, conditional statements) required.` — placement-exam escape + free-prose knowledge requirement.
4. `ECS 017` — `MAT 016A (can be concurrent) or MAT 017A (can be concurrent) or MAT 019A { can be concurrent } or MAT 021A (can be concurrent).` — per-code concurrency markers *inline*, instead of UCSC's separate `Concurrent enrollment in X is required` sentence.
5. `ECS 034` — `ECS 032C C- or better; or consent of instructor.`
6. No prereq ⇒ the `detail-prerequisite` paragraph is simply absent (172 of 185 ECS blocks have one).

The AND-of-ORs core survives, but the normalized schema must carry **per-course min-grade and per-course concurrency-allowed** annotations — at UCSC those are course-level afterthoughts; at Davis they are per-token.

## 6. Differences vs UCSC (schema impact)

| Aspect | UCSC | UC Davis |
|---|---|---|
| Term system | Quarter | **Quarter** (same seasons; Davis also runs two summer sessions) |
| Platform | SmartCatalog IQ | CourseLeaf (`courseblock` divs, `sc_courselist` degree tables, ribbit API) |
| Code format | `CSE 12`, `MATH 19B` (no padding) | `ECS 036A`, `MAT 021A`, `MAT 000B` — **zero-padded 3-digit numbers**; prose sometimes unpadded/unspaced (`MAT108`). Normalization needs a Davis-specific rule (pad-stripping) so `ECS036A` and prose `ECS 36A` unify; **open question:** whether display should keep padding (catalog does) — Schedule Builder reportedly displays unpadded. |
| Listing unit | Department page (with cross-listed tail duplicates) | Subject-code page; cross-listings are a *label*, no duplicate blocks observed |
| Units | Separate `Credits` div, bare number/range | In the header title, `(4 units)` / `(1-5 units)` |
| GE | `PE-T`-style codes in `div.genEd` | `Name (ABBR); …` pairs under a `General Education:` label; different code vocabulary |
| Prereq location | Mixed into one `Requirements` blob with restrictions | **Dedicated `detail-prerequisite` paragraph**; restrictions/antireqs split into their own labels — *less* LLM surface than UCSC |
| Min grades / concurrency | Rare, sentence-level | Pervasive, token-level (`C- or better`, `(can be concurrent)`) — normalized prereq schema needs per-code qualifiers |
| Divisions | From URL path segment | Not marked per course; infer from number (001–099 lower, 100–199 upper, 200+ grad — standard UC numbering) |
| Archived editions | Pinnable HTML per year | PDF only |
| Registration-pass restrictions | n/a | `Pass One/Pass Two` enrollment windows in restriction prose |

## 7. Offerings / schedule source (brief)

- **Schedule Builder** (`my.ucdavis.edu/schedulebuilder`) requires CAS login — not scrapeable anonymously.
- The public **course search tool** `https://registrar-apps.ucdavis.edu/courses/search/index.cfm` and even `registrar.ucdavis.edu` info pages returned **HTTP 403 Cloudflare challenges** ("Just a moment…") to plain curl (verified 2026-07-25). An offerings pipeline needs either a headless browser, or a different source. **Hazard: mark any Davis offerings work as blocked-on-access research first.**

## 8. Degree requirements (brief)

`https://catalog.ucdavis.edu/departments-programs-degrees/` → 538 program links (`…/computer-science-engineering/computer-science-bs/`). Program pages are CourseLeaf `table.sc_courselist` — `codecol`/`titlecol`/`hourscol` columns, `areaheader`/`areasubheader` comment rows, `orclass` rows, `blockindent` choice lists, `courselistcomment` rows like `Choose one:` with unit ranges. Structurally *very* close to UCSC's `sc-*` tables: the deterministic-membership + LLM-combinator split from `source-major-requirements.md` should transfer nearly unchanged. Cross-listed rows render as `MAT/BIS 027A` (slash inside one cell).

## 9. Prototype extraction strategy + fail-fast markers

**Deterministic (prototype implements):** code, title, units, description, prereq prose, GE abbreviations, extras-by-label, superseded-version flag.
**LLM (future):** prereq prose → groups with per-code min-grade/concurrency; credit-limitation → antirequisites; enrollment-restriction prose.

Fail-fast assertions used by `pipelines/ucdavis/catalog_courses/fetch.py`:

- Subject index: link count in **[200, 260]** (227 today).
- Per subject: `div.courseblock` count ≥ 30 for ECS/MAT (185/148 today; ±15%-style guard once snapshots exist).
- Per course: header has all three `detail-code|title|hours_html` spans; code matches `^[A-Z]{2,4} \d{3}[A-Z]{0,2}$`; title non-empty after stripping `— `; units matches `\(\d+(-\d+)? units?\)`.
- Unknown extras labels outside the observed set are collected and surfaced (drift announces itself, UCSC-style).
- Politeness: 1 request/subject + 1 index; 1.5 s+ interval.
