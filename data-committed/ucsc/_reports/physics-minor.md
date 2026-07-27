# physics-minor — verification failures

## Section: Plus three elective courses

### PHYS 100-180 elective pool missing from rule membership

Page says:

> [h4] Plus three elective courses
>   P: These can be any 5-credit physics upper-division courses chosen from PHYS 100 to PHYS 180 , or courses from the following list:
>     * AM 107 /PHYS 107 ... * MATH 130   (20 courses)

JSON has:

```json
"op": "n_of", "n": 3, "courses": [<the 20 listed non-PHYS courses only>], "constraints": []
```

The first (and primary) half of the pool — any 5-credit PHYS course from
PHYS 100 to PHYS 180 — appears nowhere in the rule's membership,
constraints, or notes; it survives only in the verbatim `source.prose`.
A student satisfying the electives with PHYS courses (the normal case for a
physics minor) would not match this rule.

Smallest correct representation: a `range` rule with `"n": 3`, a filter with
`include_ranges` [{subject: "PHYS", lo: 100, hi: 180}] plus the 20 listed
courses as include codes, keeping the not-from-your-major-department and
adviser-approval riders as constraints/notes (the notes already carry them).

All other rules (PHYS 5/6 series options, PHYS 5D, MATH 19A/20A, MATH
19B/20B, MATH 23A+23B, PHYS 102+PHYS 133) match the page.
