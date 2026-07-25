# Data Source: UCSC General Catalog — Course Pages

- **Root:** `https://catalog.ucsc.edu/en/current/general-catalog/courses`
- **Platform:** SmartCatalog IQ (Watermark) — server-rendered HTML, no JS needed for course content
- **Verified live:** 2026-07-25 (11 polite curl requests). Current edition = **2026-2027 UCSC General Catalog** (per breadcrumb).
- **POC scraper:** `/home/arelyx/workspace/prereqs-archive/yoink/fetch_courses.py` (raw dump run 2025-11-28, edition 2025-26; 87 dept files, 6,216 courses). LLM-structured output in `/home/arelyx/workspace/prereqs-archive/yoink/structuredCourses/`.

---

## 1. Does the live site still match the POC's assumptions?

**Mostly yes.** Verified against live HTML for the root page, CSE, and History:

| POC assumption | Live status (2026-07-25) |
|---|---|
| Dept discovery: `#navLocal` → `li.hasChildren > a[href^='/en/current/general-catalog/courses/']` | **Works. Returns exactly 87 department links.** |
| Course blocks: `h2.course-name` headers, fields as following siblings until next `h2.course-name` | **Works.** CSE: 230 h2s, HIS: 312 h2s. |
| Fields = `div.desc`, `div.sc-credithours`, `div.extraFields` | **Incomplete — always was.** The page also carries `div.instructor`, `div.genEd`, `div.quarter`, and bare `h4.crosslisted` + `p.sc-crosslisted` siblings that the POC silently drops (see §2). |
| Course key = `<span>` code + title inside the h2 anchor | Works: `<a href=".../lower-division/his-2a"><span>HIS 2A</span> The World to 1500</a>` |

### Drift found

1. **Department set changed with the edition roll.** POC (2025-26) had `clst-classical-studies` (0 courses even then); the current (2026-27) catalog **404s that slug** and adds `htec-humanizing-technology-certificate`. 2024-25 additionally had `acen-academic-english`, `germ-german`, `pers-persian`, `port-portuguese`, `russ-russian` (91 depts). Count hovers 87–91.
2. **The POC double-counts cross-listed courses.** Each dept page ends with `div.cross-listed` ("Cross-listed courses that are managed by another department are listed at the bottom") containing *full duplicate course blocks* with their own `h2.course-name`. The POC's page-wide `soup.select("h2.course-name")` picks these up: live CSE = 222 own courses + 8 cross-listed-tail (ECE 253, ECON 166B, ECON 272, GCH 41, …). The POC's "226 CSE courses" included that edition's tail duplicates (ECE 253, PHYS 150, STAT 266A/B/C, …).
3. **New-edition course churn** (expected): CSE gained CSE 136, CSE 196A, CSE 232B, CSE 239B since the POC run.
4. **404 handling:** dept 404s return HTTP 404 with a JS redirect stub (references `/Institutions/University-of-California-Santa-Cruz/json/Current.json` — that JSON is stale, says `{"Catalog":"general-catalog","Year":"2019-2020"}`; do not trust it for edition detection).

---

## 2. Per-course fields in the live HTML

A course block is the sibling run after each `h2.course-name` (stop at the next one). Real excerpt (CSE 3):

```html
<h2 class="course-name">
  <a href="/en/current/general-catalog/courses/cse-computer-science-and-engineering/lower-division/cse-3">
    <span>CSE 3</span> Computing Technology in a Changing Society</a>
</h2>
<div class="desc">Introduction to computer hardware, software, and networking, … (Formerly offered as Personal Computer Concepts: Software and Hardware.)</div>
<div class="sc-credithours"><h3>Credits</h3><div class="credits">5</div></div>
<div class="desc"></div>
<div class="desc"></div>
<div class="instructor"><h4>Instructor</h4><p>   </p></div>
<div class="genEd"><h4>General Education Code</h4><p>PE-T</p></div>
```

| Field | Selector (within block) | Deterministic? | Notes |
|---|---|---|---|
| Code | `h2.course-name a span` | **Yes** | e.g. `CSE 101`, `HIS 9C`, `PHYS 5N` |
| Title | anchor text minus the span | **Yes** | |
| Level | from the anchor href path segment | **Yes** | `lower-division` / `upper-division` / `graduate` |
| Detail-page URL | anchor href | **Yes** | Per-course pages exist but add nothing (no genEd/quarter; instructor renders as `, , , , ,`). Scrape dept listing pages only. |
| Description | first non-empty `div.desc` | **Yes** | 2 empty trailing `div.desc` per block are normal. Contains `a.sc-courselink` anchors around course mentions (usable as a prereq-mention signal). |
| Units | `div.sc-credithours div.credits` | **Yes** | Usually a number; ranges like `1-5` exist. |
| Instructor | `div.instructor p` | **Yes (structurally)** | Wildly inconsistent by dept: HIS 288/288 populated (`Benjamin Breen`, …); CSE 169 divs, only 2 non-blank (both `The Staff`). Treat as optional garnish. |
| **GE code** | `div.genEd p` | **YES — fully structured, no LLM needed** | `<h4>General Education Code</h4><p>PE-T</p>`. Observed values: CSE `MF, PE-T, PR-E, SR`; HIS `CC, ER, IM, PE-E, PE-H, PE-T, PR-E, PR-S, SI, TA`. One `<p>`, may contain comma-separated multiples — split defensively. Grad courses simply lack the div (CSE: 20 of 222 have one; HIS: 152 of 307). |
| Quarter offered | `div.quarter p` | **Yes, but rare** | `<h4>Quarter offered</h4><p>Summer</p>`. HIS: 12 of 307 (`Summer`, `Fall, Winter`, `Fall, Winter, Spring`); CSE: 0. The catalog is **not** a schedule (see §3). |
| Requirements prose | `div.extraFields` with `h4` = `Requirements` | Structurally yes; **prose needs LLM** | Prereqs, coreqs, enrollment restrictions all in one prose blob (see §5). |
| Repeatable | `div.extraFields` with `h4` = `Repeatable for credit` | **Yes** | Body is always `Yes` (1,490 occurrences in POC data; absent = not repeatable). |
| Cross-listing (inline) | bare siblings `h4.crosslisted` + `p.sc-crosslisted` | **Yes** | e.g. HIS 9C → `<h4 class="crosslisted">Cross Listed Courses</h4><p class="sc-crosslisted">CRES 13</p>`. NOT wrapped in a div — a div-only sibling walk (like the POC's) misses it. |
| Dept-specific extras | other `extraFields` h4s | **Yes** | e.g. HIS has `<h4>American History and Institutions</h4>Yes` (16 courses). Parse `extraFields` generically by h4 label. |
| "Formerly …" | end of description prose | **Regex-able** | `(Formerly CMPS 5J.)`, `(Formerly offered as …)` — 632 occurrences in POC raw data. `\(Formerly[^)]*\)$` catches nearly all. |
| Corequisites | inside Requirements prose | **LLM/regex** | Phrased `Concurrent enrollment in X is required` or `Previous or concurrent enrollment in X`. |

**Bottom line: GE codes, units, repeatability, cross-listings, quarter-offered, and instructor are all deterministically extractable from labeled divs. Only the Requirements prose (and audition/enrollment notes hiding in descriptions) needs an LLM.** The POC's raw dumps are missing genEd/instructor/quarter/inline-crosslist entirely (0 hits for "Quarter offered", 3 for "General Education" — those 3 are prose coincidences like the LIT 126H description "(UCSC General Education Code: CC)").

---

## 3. Variance across departments

Counts from POC raw data (87 depts, 6,216 courses) plus live checks:

| Dept | Courses | With extraFields | Notes |
|---|---|---|---|
| CSE (big SOE) | 226 POC / 230 live (222 own + 8 xlist) | 201 | genEd sparse (20), instructor essentially absent, quarter absent. Banner links planned offerings out to `https://courses.engineering.ucsc.edu/courses/cse/2026`. |
| HIS (humanities) | 302 POC / 312 live (307 own + 5 xlist) | 141 | Instructor 100% populated, genEd on ~half, `American History and Institutions` extra field, 12 `Quarter offered` divs. |
| LIT | 440 | 172 | Largest dept; mostly restriction-style requirements. |
| Colleges (COWL, CRWN, STEV, …) | 19–57 each | ~half | Topical seminars; heavy `Repeatable for credit`; many likely rarely offered. |
| Tiny languages (FIL 1, PUNJ 3, YIDD 4, LATN 4, ARBC 4) | 1–4 | | Whole file can legitimately be nearly empty. |
| CLST | 0 POC → **404 live** | | A dept page can exist with zero courses, then vanish next edition. |

**"Courses that are never offered":** yes, expect many. The catalog lists everything *approved*, not what runs; `Quarter offered` appears on <1% of courses (mostly Summer Session, which is schedule-driven). Actual offerings require the class search / dept schedule pages (e.g. the CSE banner above). A planning app must treat catalog presence ≠ availability.

Field-presence variance to design for: description can be empty (POC defaulted to "No description provided."), credits can be a range, instructor blank or `The Staff`, genEd absent on all grad courses, extraFields absent on ~30% of courses overall (1,856 of 6,216 had none).

---

## 4. Catalog edition scheme

- `/en/current/…` — the live edition. Identified only by the **breadcrumb**: `<a href="/en/current/general-catalog">2026-2027 UCSC General Catalog</a>`. Record this string with every scrape run.
- Archived editions are **pinnable**: `/en/2025-2026/…`, `/en/2024-2025/…`, back through `/en/2019-2020/…` (all linked from `catalog.ucsc.edu` homepage). Same page structure — the 2024-25 and 2025-26 courses roots parse with the identical `#navLocal` selector (90 and 87 dept links respectively; note archived nav hrefs start with `/en/<year>/`, so don't hardcode `/en/current/` in the selector).
- The current year has **no** explicit `/en/2026-2027/` URL yet (404 today); it appears once archived, typically after the next roll. So "pin the current year" = scrape `/en/current/` now and remember the breadcrumb year; historical re-scrapes can use the year URLs.
- `/Institutions/University-of-California-Santa-Cruz/json/Current.json` exists but is stale (claims 2019-2020) — ignore.

---

## 5. Prerequisite prose patterns (what the LLM must handle)

The `Requirements` extraFields blob is semi-formulaic but genuinely needs NLP/LLM for full fidelity. Real samples from POC `structuredCourses/` (`rawRequirements`, verbatim incl. spacing quirks):

1. **Simple AND-of-ORs (the common hard case):** `CSE 101` — `Prerequisite(s): CSE 12 or BME 160 ; CSE 13E or ECE 13 or CSE 13S ; and CSE 16 ; and CSE 30 ; and MATH 11B or MATH 19B or MATH 20B or AM 11B or ECON 11B.` (semicolons = AND groups, `or` inside groups)
2. **Single course + permission escape:** `MUSC 105I` — `Prerequisite(s): MUSC 30A or by permission of instructor.`
3. **Placement score OR course-list, plus coreq lab:** `STAT 17` — `Prerequisite(s): Mathematics placement (MP) score of 300 or higher or completion of AM 3 or AM 11A or ECON 11A or MATH 3 or MATH 11A or MATH 16A or MATH 19A or MATH 20A . Concurrent enrollment in STAT 17L is required.`
4. **Score threshold embedded mid-list:** `CSE 30` — `Prerequisite(s): CSE 20 or BME 160 ; and MATH 3 or … or ECON 11A, or a score of 400 or higher on the mathematics placement examination (MPE).`
5. **Concurrent-or-prior:** `PHYS 6M` — `Prerequisite(s): Previous or concurrent enrollment in Phys 6B.` (note lowercase `Phys` — code normalization needed)
6. **Prereq + mandatory coreq:** `PHYS 5C` — `Prerequisite(s): PHYS 5A and MATH 19B or MATH 20B . Concurrent enrollment in PHYS 5N is required.`
7. **Campus writing requirement + course + coreq:** `EART 140` — `Prerequisite(s): satisfaction of the Entry Level Writing and Composition requirements and EART 110A . Concurrent enrollment in EART 140L is required.`
8. **Non-course knowledge prereq:** `CSE 258` — `Prerequisite(s): linear algebra familiarity. Enrollment is restricted to graduate students, undergraduate students with linear algebra familiarity may enroll by permission of the instructor.`
9. **Placement exam OR course:** `AM 3` — `Prerequisite(s): score of 200 or higher on the mathematics placement examination (MPE), or MATH 2 .`
10. **Kitchen sink (writing req + courses + permission + standing + major restriction):** `AM 170A` — `Prerequisite(s): satisfaction of the Entry Level Writing and Composition requirements. AM 30 , and AM 114 , and STAT 131 or CSE 107 , or by instructor permission. Enrollment is restricted to juniors and seniors majoring in applied mathematics and proposed applied mathematics…`
11. **Major/standing restriction only:** `POLI 190E` — `Enrollment is restricted to senior politics and Latin America and Latino studies/politics combined majors.` (also `ANTH 142` — `restricted to anthropology and legal studies majors.`)
12. **Antirequisite:** `CSE 20` — `Antirequisite: Students cannot enroll in this class after receiving a C or better in CSE 30 .`
13. **Interview gate:** `GAME 210` — `Enrollment is restricted to games and playable media and serious game graduate students; others by interview.`
14. **Coreq only, no prereq:** `ANTH 280L` — `Enrollment is restricted to graduate students. Concurrent enrollment in ANTH 280 is required.`
15. **Label variance / typos exist:** `CSE 156` raw — `Requirements ,Prerequisites: CSE 150 and CSE 101 . Concurrent enrollment in course CSE 156L is required.` (stray comma; `Prerequisites:` instead of `Prerequisite(s):`)
16. **Requirements-slot occupied by something else:** `THEA 56D` / `MERR 195` — extraFields is just `Repeatable for credit Yes` (POC lumped it into "requirements").
17. **Gates hiding in the description, not Requirements:** `THEA 21` — description ends `Admission by audition at first class meeting.`; `BIOL 103L` description carries waitlist/application instructions (`Application will be required. Inquire with Instructor.`).

POC stats: 4,360 / 6,216 courses have a non-empty extraFields blob; the POC LLM produced non-empty `prereqGroups` for 1,577 (all tokens clean `DEPT###` ids — schema `{id, name, description, credits, rawRequirements, prereqGroups: [[OR…] AND …]}`). That AND-of-ORs shape loses: coreqs, min-grades, placement scores, standing/major restrictions, antirequisites, and permission escapes — a richer target schema should carry those as separate typed fields, with `rawRequirements` always preserved verbatim for display.

---

## 6. Recommended extraction strategy

**Deterministic (BeautifulSoup, no LLM):** code, title, level (from URL), detail URL, description, units, GE codes (`div.genEd p`), quarter offered (`div.quarter p`), instructor (`div.instructor p`), repeatable (`extraFields[h4=Repeatable for credit]`), cross-listings (`h4.crosslisted` + `p.sc-crosslisted`, and skip/flag the tail `div.cross-listed`), "Formerly …" (regex on description tail), requirements prose (verbatim from `extraFields[h4=Requirements]`), dept-specific extras keyed by h4 label. Walk **all** siblings (tags, not just divs) between `h2.course-name` headers; parse `extraFields` by its `h4` label rather than positionally.

**LLM (or a grammar + LLM fallback):** parsing the Requirements prose into prereq groups / coreqs / restrictions / antirequisites / score thresholds, and optionally mining descriptions for audition/application gates. Everything else the POC sent through an LLM can now be deterministic.

**Fail-fast assertions for the scraper:**

- Root page: `#navLocal` exists; dept link count in **[80, 100]** (87 today; 91 in 2024-25). Hard-fail outside range.
- Breadcrumb matches `(\d{4})-(\d{4}) UCSC General Catalog`; log + alert when the year changes from the last run (edition roll = expected churn).
- Per dept: HTTP 200 (404 = dept removed → diff against previous run's dept list and report, don't crash the whole run); `div.courselist` present; `h2.course-name` count > 0 for depts that previously had > 0, and within ±15% (or ±5 courses for small depts) of the previous run.
- Global: total own-courses (excluding `div.cross-listed`) in [5500, 7000] (6,216 in 2025-26).
- Per course: code matches `^[A-Z]{1,5} \d+[A-Z]*$`; title non-empty; credits non-empty on ≥95% of courses; every extraFields h4 label ∈ known set {Requirements, Repeatable for credit, Cross Listed Courses, Quarter offered, …} else log new label (this is how schema drift will announce itself).
- Assert each course block yielded no *unrecognized* sibling tag classes (whitelist: desc, sc-credithours, instructor, genEd, quarter, extraFields, crosslisted/sc-crosslisted, cross-listed) — the POC's silent-drop of unknown divs is exactly how GE codes got lost.
- Politeness: ~90 requests/run, 1–2 s delay; pages are static HTML, one request per dept suffices.
