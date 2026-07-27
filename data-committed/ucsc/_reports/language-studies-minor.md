# language-studies-minor — verification failures

Ground truth: `render_page language-studies-minor` (snapshot 20260727T041640Z).
Candidate: `data-committed/ucsc/programs/language-studies-minor.json`.

## 1. Advanced Language Requirement — `range` filter contradicts the prose

Page:

> Chinese: CHIN 100-199
> French: FREN 111 -114 and 120-199 or from the LIT 182 series
> Italian: ITAL 100-199 (excluding ITAL 101) or from the LIT 185 series
> Japanese: JAPN 100-199
> Spanish: SPAN 100-199, SPHS 100-199, or from the LIT 188 or 189 series

JSON filter on the `range` rule:

- `exclude_ranges`: JAPN 100-199, SPAN 100-199, SPHS 100-199 — these are
  **inclusions** on the page (Japanese and Spanish options), not exclusions.
- `exclude_codes`: `ITAL101` (correct) but also `LIT185` and `LIT188` — the
  LIT 185 and LIT 188 series are **included** options (Italian, Spanish).
- `include_ranges`: FREN only 111-114 — the page also includes FREN 120-199.
- `include_series`: only LIT 182 — LIT 185, LIT 188, and LIT 189 series are
  missing.

Smallest correct representation:
`include_ranges`: CHIN 100-199; FREN 111-114; FREN 120-199; ITAL 100-199;
JAPN 100-199; SPAN 100-199; SPHS 100-199.
`include_series`: LIT 182, LIT 185, LIT 188, LIT 189.
`exclude_codes`: ITAL 101.
(The language-of-concentration alignment and the LIT-only-after-Level-6 rider
stay as constraint/note text.)

## 2. Upper-Division Electives — required two-course rule encoded as `info`

Page:

> P: The minor requires two 5-credit upper-division elective courses. Courses
> may be chosen from:
> LI: LING 100-189
> LI: LING 200-289 (with instructor permission)
> LI: The list of approved cultural context courses
> LI: Additional Advanced Language courses listed above

JSON: `"op": "info"` — advisory, never required — so the two-course
requirement is dropped from the machine-readable requirements. Because the
"approved cultural context courses" pool is genuinely unenumerated, the
smallest correct representation is `category_count` with `n: 2` and
`needs_review: true` (the enumerable LING ranges could alternatively be a
`range` filter), with the option prose carried as constraints.

## Sections verified with no discrepancy

LING 50 all_of, Level-6 language one_of (CHIN/FREN/ITAL/JAPN/SPAN/SPHS 6),
linguistics n_of-2 with the LING 111/112 mutual-exclusion rider as a note,
Course Substitution Policy as info.
