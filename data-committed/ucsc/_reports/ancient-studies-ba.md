# ancient-studies-ba — verification failures

Ground truth: `render_page ancient-studies-ba` (snapshot 20260727T041640Z).
Candidate: `data-committed/ucsc/programs/ancient-studies-ba.json`.

## 1. Electives — stated count "Six" not captured

Page (Requirements and Planners > Electives):

> P: Six additional ancient studies 5-credit upper-division courses:

JSON: the rule has `"op": "list"`, `"n": null`. `list` is only valid as a pool
drawn from by a counting parent, and no counting parent (e.g. an `n_of` with
`from_following_lists`) exists here; the count six lives only in `source.prose`.
The 44-course membership itself is correct.

Smallest correct representation: `"op": "n_of", "n": 6` over the same course
pool.

## 2. Disciplinary Communication (DC) Requirement — count of two not captured; sub-lists left as `op: "unknown"`

Page:

> P: ... The DC requirement in ancient studies is satisfied by completing two
> 5-credit upper-division courses in Greek literature or Latin literature from
> the following list:
> [h5] Greek Literature: LIT 184B, LIT 184C, LIT 184D, LIT 184E
> [h5] Latin Literature: LIT 186B, LIT 186C, LIT 186D

JSON: an `info` rule with the prose, followed by two rules with
`"op": "unknown"`, `"needs_review": true` (`LIT184B–E` and `LIT186B–D`). The
required count of two is not represented anywhere machine-readable, and
`unknown` is not a valid operator.

Smallest correct representation: a single `n_of` with `n: 2` over the combined
pool `[LIT184B, LIT184C, LIT184D, LIT184E, LIT186B, LIT186C, LIT186D]` (the
Greek/Latin split is presentational only).

## Sections verified with no discrepancy

Lower-Division options (GREE 1-2 / LATN 1-2), Ancient Studies Survey one_of
(19 courses), Upper-Division n_of-3 (LIT 184A–E / 186A–D), Comprehensive
Requirement info, qualification/screening segregation.
