# Data Source: UC San Diego General Catalog — Course Pages (preliminary)

- **Root:** `https://catalog.ucsd.edu/front/courses.html` (index) → per-subject pages `https://catalog.ucsd.edu/courses/<SUBJ>.html` (e.g. `CSE.html`, `MATH.html`)
- **Platform:** hand-maintained static HTML (Dreamweaver library comments `<!-- #EndLibraryItem -->` in source) — fully server-rendered, no JS needed
- **Verified live:** 2026-07-25 (7 polite curl requests). Current edition = **UC San Diego General Catalog 2026–27** (page title `2026-27 Catalog of Record`).
- **Status:** preliminary research + prototype fetch only (`pipelines/ucsd/catalog_courses/fetch.py`). Not integrated; no LLM stage.
- UC San Diego is on the **quarter system** (like UCSC), so `term_system` and season vocabulary carry over.

---

## 1. How courses are listed

The index links **86 subject pages** (`href="../courses/CSE.html"`). Each subject page is one flat document: `h2.course-subhead-1` section headers (`Lower Division`, `Upper Division`, `Graduate` — plus **extras like `Teaching of Mathematics`** on MATH), then repeating pairs of paragraphs:

```html
<p class="anchor-parent"><a class="anchor" id="cse3" name="cse3"></a></p>
<p class="course-name">CSE 3. Fluency in Information Technology (4)</p>
<p class="course-descriptions">Introduces the concepts and skills necessary to effectively use
information technology. ... <strong class="italic"><em>Prerequisites:</em></strong> none.</p>
```

Counts observed: CSE 212 courses, MATH 224. **Everything about a course is packed into two `<p>` tags** — there are no per-field elements at all.

## 2. Per-course fields

| Field | Where | Deterministic? | Notes |
|---|---|---|---|
| Code | `p.course-name`, before the first `.` | **Yes (regex)** | `CSE 3`, `CSE 8A`, `CSE 4GS`, `MATH 31AH`. **Cross-listed courses put ALL codes in the name**: `CSE 241A/ECE 260B. VLSI Integration …`. |
| Title | between `.` and the trailing `( … )` | **Yes (regex)** | May be followed by `&nbsp;<strong><em>Tag: Theory/Abstraction</em></strong>` (CSE-only elective-tag annotation). |
| Units | trailing parenthesis of `p.course-name` | **Yes (regex)** | `(4)`, `(2 or 4)`, `(1–4)` (en-dash `&#8211;`), `(1–16)`, `(1 to 4)` (MATH 295, caught live), and **sequence listings** `(4-4-4)`. |
| Division | preceding `h2.course-subhead-1` | **Yes** | Map `Lower Division`/`Upper Division`/`Graduate`; unknown subheads (e.g. `Teaching of Mathematics`) must be kept verbatim, not force-mapped. |
| Description | `p.course-descriptions` before the `Prerequisites:` marker | **Yes** | |
| Prereq prose | `p.course-descriptions` after `<strong class="italic"><em>Prerequisites:</em></strong>` | Structurally yes; **prose needs LLM** | Marker present on only ~83% of CSE courses (175/212 have the marker; 37 grad/seminar courses have none). No anchors around course mentions — plain text only. |
| Anchor id | `a.anchor` in preceding `anchor-parent` p | **Yes** | `cse3`, `cse4gs` — lowercase squashed code; used by ScheduleOfClasses deep links. |
| GE codes | **absent** | — | UCSD has **no campus-wide GE**; general education is defined per college (Revelle, Muir, …, Eighth). Course→GE mapping does not exist in the catalog. The normalized `ge_codes` column stays empty; college GE will need its own source + modeling. |
| Instructor / quarters offered / repeatability | **absent** as structured fields | — | Repeatability appears as prose (`May be taken for credit up to four times`, etc.) inside the description. |

## 3. Quirks / hazards

1. **Sequence courses are one entry**: `MATH 220A-B-C. Complex Analysis (4-4-4)` is *three* courses (`MATH 220A`, `220B`, `220C`) in a single `course-name`. 7 such on MATH alone (all graduate). Normalization must explode these or record them explicitly; the prototype records the raw form and flags it.
2. **Cross-listing via slashed name**: `CSE 256/LING 256. Statistical Natural Language Processing (4)` — no separate cross-list field; the slash list *is* the data. First code = owning subject (matches page).
3. `p.course-name` can contain trailing markup (`Tag: …` strongs, stray `&#160;`) — 61 of 212 CSE names contain tags; text-extract then regex. **Both `Tag:` and `Tags:` occur** (CSE 127: `Tags: Systems, Applications of Computing` — caught live by the prototype's unparseable-name guard).
4. The prereq prose routinely **continues past the actual prerequisites** into restriction sentences: `CSE 11 or CSE 8B or ECE 15; two units of credit offered for CSE 29 if CSE 15L taken previously.` / `…; restricted to students within the CS29 major. All other students will be allowed as space permits.` There is no structural boundary — the LLM stage must separate prereqs from restrictions.
5. `Prerequisites: none.` is a common explicit value — distinct from "marker absent" (mostly grad courses: `graduate standing`-style text is also seen *with* the marker).
6. Grad-course boilerplate like `Special Studies form required. Department stamp required.` rides in the prereq slot.
7. Typos exist in the live HTML (curriculum page: `CSE89` missing its space) — code regexes should be tolerant when *extracting mentions*, strict when *parsing headers*.
8. HTML entities are heavy (`&#8211;` en-dash in unit ranges, `&#8217;` apostrophes, `&#8212;` em-dashes in titles) — unescape before regexing; the units regex must accept both `-` and `–`.

## 4. Edition scheme

The catalog site serves a single "Catalog of Record" per year (`2026-27 Catalog of Record` in `<title>`; body text `UC San Diego General Catalog 2026–27`). No archived-year HTML tree was found under the same host during this pass (archives live elsewhere as PDFs). As with Davis: snapshot early; record the edition string per run.

## 5. Prerequisite prose style (real samples, verbatim)

1. `CSE 29` — `CSE 11 or CSE 8B or ECE 15; two units of credit offered for CSE 29 if CSE 15L taken previously.` — OR-list + credit-limitation tail in the same sentence.
2. `CSE 100` (CS29 variant) — `CSE 12 and CSE 25 and CSE 15L or CSE 29 and MATH 18 or MATH 31AH and MATH 20C or MATH 31BH; restricted to students within the CS29 major. All other students will be allowed as space permits.` — **`and`/`or` chained without parentheses or semicolons**; operator precedence is genuinely ambiguous and must be resolved by the LLM (UCSC's semicolon-delimited groups are far more parseable).
3. `CSE 4GS` — `MATH 10A or MATH 20A; department approval, and corequisite of CSE 6GS.` — coreq named inline with `corequisite of`.
4. `CSE 99` — `lower-division standing. Completion of thirty units at UC San Diego with a UC San Diego GPA of 3.0. Special Studies form required. Department stamp required. Consent of instructor and approval of the department.` — no course tokens at all.
5. `CSE 5` — description tail (outside the marker): `Students may only receive credit for one of CSE 5, CSE 5R, or CSE 25.` — antirequisites live in description prose, unmarked.
6. `CSE 3` — `none.`

## 6. Differences vs UCSC (schema impact)

| Aspect | UCSC | UC San Diego |
|---|---|---|
| Term system | Quarter | **Quarter** (plus 3 summer session variants — see §7 term codes) |
| Platform | SmartCatalog IQ (structured divs) | **Hand-maintained static HTML**; only 2 CSS classes carry all data — highest drift risk of the three campuses; guard hard |
| Code format | `CSE 12` | `CSE 12`, `CSE 4GS`, `MATH 31AH` — same shape, **no padding** (unlike Davis); plus slashed multi-codes and `220A-B-C` sequences |
| Listing unit | Dept page w/ cross-listed tail | Subject page; cross-listing via slashed course-name |
| Units | Own credits div | In the name line `(4)`; `(2 or 4)`, `(1–4)`, `(4-4-4)` sequences |
| GE | Campus-wide codes per course | **None in catalog — per-college GE systems**; `ge_codes` cannot be populated from this source |
| Prereq location | Labeled `Requirements` field | Inline `Prerequisites:` marker inside the description paragraph; ~17% of courses lack it |
| Prereq grammar | Semicolon-grouped AND of ORs | Free `and`/`or` chains, precedence ambiguous; restrictions concatenated after `;` |
| Division | URL path | `h2` section headers (+ nonstandard sections) |
| Repeatable / instructor / quarter offered | Labeled fields | Absent / prose only |

## 7. Offerings / schedule source (brief)

**ScheduleOfClasses** is public and server-rendered: `https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudent.htm` (form) → GET `scheduleOfClassesStudentResult.htm?selectedTerm=FA25&selectedSubjects=CSE&page=1` (verified 200, 154 KB). Term codes: `FA25`, `WI26`, `SP26`, `S126`/`S226`/`S326` (summer sessions I/II/III), `SA26`, `SU26`. Results are `<table>` rows: `td.crsheader` (number, title, `( 4 Units)`) and `tr.sectxt` section rows (section id, meeting type, days/times, instructor, seats). Paginated. Bonus: a per-course prereq popup endpoint `scheduleOfClassesPreReq.htm?termCode=FA25&courseId=CSE3` — a second, semi-structured prereq source that could cross-check the LLM's catalog parse.

## 8. Degree requirements (brief)

Per-department curriculum pages `https://catalog.ucsd.edu/curric/CSE-ug.html` (index links `../curric/<SUBJ>[-ug|-gr].html`). **Pure prose**: `h4` numbered requirement sections with `ol/li` lists, e.g. `CSE 8B or CSE 11, CSE 12, (CSE 15L or CSE 29), CSE 20 (or MATH 15A or MATH 31CH or MATH 109) … (twenty-two or twenty-four units)` — unit counts written out **in words**. No `sc_courselist`-style tables (UCSC/Davis have those). UCSD requirements will need a much heavier LLM share, and college GE adds a second dimension UCSC's model lacks. Majors also live behind capped-major codes (`CS29` appears in prereq prose as an enrollment gate).

## 9. Prototype extraction strategy + fail-fast markers

**Deterministic (prototype implements):** code(s), title, units text, division from subheads, description, prereq prose after the marker, anchor id, sequence/cross-list flags.
**LLM (future):** prereq prose → groups + restrictions split; antirequisite mining from descriptions; curric-page prose → requirement rules.

Fail-fast assertions used by `pipelines/ucsd/catalog_courses/fetch.py`:

- Index: subject-page link count in **[70, 110]** (86 today).
- Per subject: `p.course-name` count == `p.course-descriptions` count, and ≥ 100 for CSE/MATH (212/224 today).
- Every `course-name` must parse as `codes '.' title '(' units ')'` (after entity-unescape and tag-strip); unparseable names hard-fail rather than skip.
- Known subhead check: unexpected `course-subhead-1` values are surfaced in the manifest, not dropped.
- Politeness: 1 request/subject + 1 index; 1.5 s+ interval.
