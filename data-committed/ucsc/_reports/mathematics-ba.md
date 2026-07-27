# mathematics-ba — verification failure

Scope note: all degree-requirement sections verified clean — Lower-Division choices
(including the [MATH 23A+23B | AM 30+AM 100] options), Upper-Division (MATH 100;
analysis/algebra/geometry one_ofs; MATH 194/195), Electives (n_of 3 from the 20-course
MATH pool + approved other-department `list`, with the "only two from the approved list"
rider as constraint prose), DC (MATH 100 + one of MATH 194/195), Comprehensive (one of
MATH 194/195), and Major Qualification (one_ofs + all_of [MATH 23A, MATH 100]). The
single discrepancy is below.

## 1. Transfer Admissions Screening Policy: required course list unresolved (`op: "unknown"`)

**Page says** (rendered source):

```
[h4 sc-level-2] Transfer Admissions Screening Policy
  P: The following courses or their equivalents are required prior to transfer, by the end of the spring term for students planning to enter in the fall.
  ...
    * MATH 19A
    * MATH 19B
    * MATH 21
    * MATH 23A
```

A plain conjunction: all four courses (or equivalents) are required prior to transfer.

**JSON has**: `"op": "unknown"`, `needs_review: true`, courses ["MATH19A", "MATH19B",
"MATH21", "MATH23A"] in the "Transfer Admissions Screening Policy" qualification
section — the rule is unresolved rather than typed.

**Smallest correct representation**: `"op": "all_of"` over the four courses,
`needs_review: false` (screening stays segregated in the qualification section).
