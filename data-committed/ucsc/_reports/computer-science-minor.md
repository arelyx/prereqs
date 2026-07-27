# computer-science-minor — verification failures

## Section: Upper-Division Courses — Plus two additional upper-division courses

**What the page says** (rendered snapshot):

```
[h4 sc-level-2] Plus two additional upper-division courses
  P: Two additional courses satisfying one of the following conditions. Lecture/lab combinations count as one course. If a lecture has a lab offered (required or optional), the lab must be passed to count for this requirement.
  LI: Any 5-credit or more upper-division CSE course with a number between 100 and 189 or CSE 195 .
  LI: Any 5-credit or more CSE course with a number between 201 and 279. Approval for courses with numbers 290 and above may be requested by submitting a course substitution petition to the BE Undergraduate Advising Office. Courses with numbers 280-289 are not eligible. Undergraduate students require permission from the instructor to enroll in graduate courses.
  LI: Any course from the following list
    * AM 148
    * AM 160
```

i.e. two courses drawn from CSE 100-189 / CSE 195 / CSE 201-279 / AM 148 /
AM 160.

**What the JSON has**: `"op": "n_of"`, `"n": 2`, `"courses": ["AM148",
"AM160"]` — the CSE number-range conditions survive only as a prose
`constraints` entry and `source.prose`. As encoded, the rule requires both
AM 148 and AM 160 specifically, excluding the entire CSE range membership
that dominates this requirement.

**Smallest correct representation**: `"op": "range"`, `"n": 2`, with a filter
carrying `include_ranges` `[{"subject": "CSE", "lo": 100, "hi": 189},
{"subject": "CSE", "lo": 201, "hi": 279}]`, `include_codes`/`courses`
`["CSE195", "AM148", "AM160"]`, and the 5-credit / lecture-lab / 280-289
exclusion riders kept as notes (the schema's `range` op with
`include_ranges`/`exclude_codes` is already used this way in, e.g.,
`literature-minor.json`).

## Note (not itself a failure)

The page's h3 grouping ("Lower-Division Courses" / "Upper-Division Courses")
is flattened: the lower-division rules are emitted as per-heading sections
with `kind: "other"` and titles like "One of the following options:". The
rules' membership, operators, and counts are otherwise correct; only the
final upper-division rule above is a substantive discrepancy.
