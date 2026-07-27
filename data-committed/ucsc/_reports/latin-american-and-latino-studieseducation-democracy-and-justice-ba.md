# Verification report: latin-american-and-latino-studieseducation-democracy-and-justice-ba

## Discrepancy 1 — "Three EDUC Courses" elective requirement encoded as info

**Section title:** Upper-Division Elective Courses / Three EDUC Courses

**What the page says (rendered lines):**

> [h5 sc-level-3] Three EDUC Courses
> P: Three 5-credit EDUC courses from 102-187.

**What the JSON has:**

`"op": "info"` with empty `courses`, `"n": null`, no filter. The required
count of 3 and the EDUC 102-187 range are not represented (info is
advisory/never required).

**Smallest correct representation:**

```json
"op": "range",
"n": 3,
"filter": {
 "exclude_codes": [], "exclude_ranges": [],
 "include_ranges": [{"hi": 187, "lo": 102, "subject": "EDUC"}],
 "include_series": []
}
```

## Discrepancy 2 — "Two LALS Courses" elective requirement encoded as info

**Section title:** Upper-Division Elective Courses / Two LALS Courses

**What the page says (rendered lines):**

> [h5 sc-level-3] Two LALS Courses
> P: Two 5-credit LALS electives numbered 101-190.

**What the JSON has:**

`"op": "info"` with empty `courses`, `"n": null`, no filter — the count of 2
and the LALS 101-190 range are not represented.

**Smallest correct representation:**

```json
"op": "range",
"n": 2,
"filter": {
 "exclude_codes": [], "exclude_ranges": [],
 "include_ranges": [{"hi": 190, "lo": 101, "subject": "LALS"}],
 "include_series": []
}
```

(The Spanish-language rider — page h6 under "Two LALS Courses": "At least
one elective must be taught in Spanish", listing LALS 135/157/183 — is
carried as a sibling `one_of` rule with a prose constraint; note it is a
rider on the electives rather than an additional course, so ideally it
belongs as a constraint on the elective rules, but the choose-one semantics
over the pre-approved list are defensible once the elective counts exist.)

## Discrepancy 3 — Comprehensive Requirement encoded as info

**Section title:** Comprehensive Requirement

**What the page says (rendered lines):**

> [h4 sc-level-2] Comprehensive Requirement
> P: The Comprehensive Requirement is fulfilled by completing one senior seminar (LALS 194 A-Z, excluding L) and a Writing Lab ( LALS 194L ).

**What the JSON has:**

A single `"op": "info"` rule with no courses — the required senior seminar
(one from the LALS 194 A-Z series, excluding 194L) and required LALS 194L
are not represented.

**Smallest correct representation:**

Two rules: a `range` (or series) rule with n=1 whose filter includes the
LALS 194 series and excludes LALS194L, plus an `all_of` on `["LALS194L"]`.
For example:

```json
{"op": "range", "n": 1,
 "filter": {"include_series": [{"subject": "LALS", "number": 194}],
            "exclude_codes": ["LALS194L"],
            "include_ranges": [], "exclude_ranges": []}},
{"op": "all_of", "courses": ["LALS194L"]}
```

## Discrepancy 4 — DC Requirement: op "unknown" instead of all_of

**Section title:** Disciplinary Communication (DC) Requirement

**What the page says (rendered lines):**

> [h4 sc-level-2] Disciplinary Communication (DC) Requirement
> P: Students of every major must satisfy that major's upper-division disciplinary communication (DC) requirement. The DC requirement for the combined LALS and EDJ B.A. is met by completing:
>     * LALS 100A
>     * LALS 100L

Both listed courses are required.

**What the JSON has:**

`"op": "unknown"` with `"needs_review": true` over
`["LALS100A", "LALS100L"]` — the unambiguous conjunctive semantics of a
core degree requirement are left undetermined.

**Smallest correct representation:**

```json
"op": "all_of",
"needs_review": false
```
