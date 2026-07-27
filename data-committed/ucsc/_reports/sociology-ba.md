# sociology-ba — verification failures

Ground truth: `render_page sociology-ba` (snapshot 20260727T041640Z).
Candidate: `data-committed/ucsc/programs/sociology-ba.json`.

## 1. General major — five required upper-division electives encoded as `info`

Page (General Sociology Major > Upper-division advanced coursework):

> P: Five sociology electives of 5 credits or more, numbered 110-189 are
> required. ... Up to two pre-approved outside courses can count toward the
> upper-division advanced coursework.

JSON: `"op": "info"`, `n: null` — advisory, never required — so five of the
major's eleven courses are dropped from the machine-readable requirements.

Smallest correct representation: `op: range` with `n: 5` and
`include_ranges: [{subject: SOCY, lo: 110, hi: 189}]` (5-credit minimum and
two-outside-course substitution riders as constraints), or `category_count`
`n: 5` with `needs_review: true`.

## 2. DJS concentration — same defect

Page (Sociology Major with Intensive Concentration in DJS > Upper-division
advanced coursework):

> P: Five upper-division electives of 5 credits or more are required, selected
> from Sociology 110-189, or from the list of pre-approved courses .

JSON: `"op": "info"`, `n: null`. Same fix; here the "list of pre-approved
courses" component is genuinely unenumerated, so `category_count` with
`n: 5`, `needs_review: true` is the smallest correct representation.

## 3. Comprehensive Requirement (both variants) — senior thesis n=3 contradicts "minimum of two quarters; SOCY 195C is optional"

Page (Comprehensive Requirement > Senior thesis):

> * SOCY 195A / SOCY 195B / SOCY 195C
> P: ... Students must enroll in a minimum of two quarters of thesis
> individual study courses, though three quarters is recommended. SOCY 195C is
> optional.

JSON (in both the general and DJS Comprehensive Requirement sections):
`"op": "n_of", "n": 3` over `[SOCY195A, SOCY195B, SOCY195C]` — requiring all
three quarters, while the page requires a minimum of two (SOCY 195C optional).

Smallest correct representation: `all_of [SOCY195A, SOCY195B]` with SOCY 195C
noted as optional (or `n_of, n: 2` over the three with the recommendation as a
note).

## Sections verified with no discrepancy

Screening and qualification rules (General n_of-2; DJS SOCY 30A + n_of-2 with
grade riders as notes), lower-division preparation and core (n_of-2 forms of
two-course all_of, with LALS/PSYC/STAT substitution riders as notes), the
SOCY 105A/105B core and DC rules, DJS SOCY 107A/107B and SOCY 196G practicum,
and the section_choice comprehensive structure with SOCY 196S; the
graduate-course option (SOCY 201-294, by invitation) as `info` was accepted as
an advisory/unenumerated approximation.
