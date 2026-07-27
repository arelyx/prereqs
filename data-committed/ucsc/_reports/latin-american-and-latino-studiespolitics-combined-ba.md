# latin-american-and-latino-studiespolitics-combined-ba — verification failures

## Section: Comprehensive Requirement

### Required comprehensive coded as non-required `info`

Page says:

> [h4] Comprehensive Requirement
>   P: Students satisfy the Comprehensive Requirement by completing either an LALS senior seminar (LALS 194 A-Z, excluding L) and seminar lab ( LALS 194L ), or a politics senior seminar (POLI 190 A-Z).

JSON has a single rule:

```json
"op": "info", "n": null, "courses": [], "needs_review": false
```

`info` denotes advisory prose that is never required, but this is a required
comprehensive with two concrete series-based options. The requirement is
dropped from the structured representation.

Smallest correct representation: an `options` rule with two branches —
(a) one course from the LALS 194 A-Z series (excluding LALS 194L) plus
LALS 194L, and (b) one course from the POLI 190 A-Z series — using
`range`/`include_series` sub-rules, or at minimum a `category_count` with
`"n": 1` option-choice and `needs_review: true`.

All other sections (lower-division LALS/POLI rules, upper-division core
all_of, three politics core n_of, DC all_of LALS 100A + LALS 100L) match the
page. The "Three upper-division electives" rule is `category_count` n=3 with
the 2-from-LALS-101-190 / 1-from-POLI-100-189 split carried only as prose —
an in-scope approximation, noted here for completeness.
