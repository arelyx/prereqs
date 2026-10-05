# ucsc / catalog_courses

Course catalog pipeline: `fetch` (scrape + deterministic parse) → `structure`
(deterministic prereq parsing, `prereq_parse.py`, plus committed hand
resolutions in `prereq_overrides.json`; no model inference). Source research, field inventory, and hazard
catalog: `docs/universities/ucsc/source-catalog-courses.md`.

```bash
python -m ucsc.catalog_courses.fetch                 # ~89 requests, throttled
python -m ucsc.catalog_courses.structure             # parser + overrides, ~1 s
python -m ucsc.catalog_courses.compare_prereqs --out /tmp/cmp.md  # parser vs committed groups
```

## Quirks & hazards encountered (keep updated — audit runs rely on this)

- **The POC silently dropped GE codes, quarter-offered, instructor, and inline
  cross-listings** by walking only `div` siblings. We walk all sibling tags and
  hard-fail on any block-level class not in `parse.KNOWN_BLOCK_CLASSES` —
  unknown classes are exactly how fields get lost silently.
- **Cross-listed tail double-counting:** each dept page ends with a
  `div.cross-listed` section containing full duplicate course blocks managed by
  other departments (CSE has 8, e.g. ECE 253). Parsed pages exclude them;
  the manifest records them per dept.
- **sc-courselink double-text hazard:** requirements prose wraps each course
  mention in an anchor; a descendants-based text walk emits every code twice
  ("CSE 12 CSE 12 or ..."), which would double every code in the requirement text. `_parse_extra_fields`
  walks direct children only (regression-tested).
- **Unstaffed instructor fields** render as comma/space runs (`",   ,   ,"`) —
  normalized to null.
- **HAVC `courseListHeader` label headers:** history of art uses a bare
  `<h3 class="courseListHeader">Notes</h3>` whose content lives in the
  *following* `div.desc` — caught live by the unknown-class guard on the first
  full run (exactly as designed). Routed into `extra_fields['Notes']`.
- **Departments churn on edition rolls** (CLST 404s in 2026-27; HTEC added).
  Removal of ≤5 depts vs the previous snapshot is reported, more aborts.
  Per-dept course counts are guarded at ±15% vs the previous snapshot.
- **`Quarter offered` is present on <1% of courses** — the catalog is not a
  schedule; availability comes from pisa_offerings / soe_schedule.
- **Duplicate-code guard** across departments (each course must be unique
  campus-wide after tail exclusion).
- **Structure stage = parser (hot path) + overrides (warm path).**
  `prereq_parse.parse()` emits CNF `prereq_groups`, `coreqs` (CNF, strictly
  same-term: "Concurrent enrollment in X is required", "Must be taken
  concurrently with X", "Corequisite(s):"), `concurrent_ok` (codes in groups
  allowed in the same term: "previous or concurrent enrollment in X"), and
  `confidence`. Precedence: `;` loosest, then `,`-lists, then and/or, then
  `/` and lab pairs ("CSE 15 and CSE 15L") tightest. Texts it cannot read
  without guessing (and/or mixed without punctuation, `; and` mixed with
  `; or`, `, and` mixed with `, or`, unknown subjects, non-enumerable
  "series", major-specific sentences) are `ambiguous`.
- **Overrides** (`prereq_overrides.json`) are keyed by course code and the
  sha1 of the whitespace-normalized text; a reworded text makes its override
  stale (ignored, reported in the manifest). Unresolved courses get
  `prereq_groups: null` (never a guess) and land in the snapshot's
  `ambiguous.json` for a frontier agent to read and add overrides; more than
  10% unresolved aborts the run.
- **Deliberate differences from the retired qwen prompt:** mixed expressions
  are distributed into real CNF ("CSE 30, or CSE 15 and CSE 15L" ->
  [[CSE30, CSE15], [CSE30, CSE15L]]); "two courses from A, B, C" is exact
  k-of-n CNF; "A and B or C" is flagged rather than read as A AND (B OR C),
  since the catalog uses both precedences; strict coreqs live in `coreqs`.
- **Catalog quirks seen in 2026-27 text:** subject carry-over ("MATH 11A, 19A
  or 20A", "PHYS 6A /6L", "STAT 7 /L"), cross-listed "CRES/SOCY 12", typos
  ("IITAL 6", "ENV 100", "EVS 215L"), graduate courses whose only course
  condition is "undergraduates may enroll if they have completed X" (taken as
  the prerequisite, since the planner serves undergraduates), whitespace
  re-rendering between scrapes ("CSE 12 ." vs "CSE 12.").
- Codes not in the current catalog are kept but listed in the manifest
  (`unresolved_prereq_codes`).

## Parser versioning

`prereq_parse.PARSER_VERSION` (currently `prereq_parse_v1`) is recorded in
the structured manifest (as `parser_version`, and as `prompt_version` for the
exporter's provenance field). Bump it on any behavior change and re-run
`compare_prereqs` to review what moved.
