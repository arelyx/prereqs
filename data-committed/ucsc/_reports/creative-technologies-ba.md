# creative-technologies-ba — verification failures

## Section: Lower-Division Courses — Breadth of Arts Electives

**What the page says** (rendered snapshot):

```
[h5 sc-level-3] Breadth of Arts Electives:
  P: Students majoring in creative technologies are required to take three Breadth of Arts elective courses. At least one of the three Breadth of Arts elective courses must be upper-division (numbered 100 and above). The remaining two courses may be lower- or upper-division.
  P: Courses relevant to the requirement, but not listed here (including graduate seminars), may be proposed to fulfill this requirement via petition; ...
  P: Students may choose from the list of Breadth of Arts elective courses .
```

This is a required component of the major — three Breadth of Arts elective
courses (confirmed by the Upper-Division preamble: "...and one upper-division
Breadth of Arts elective (see above), for a total of eight upper-division
courses").

**What the JSON has**: a rule with `"op": "info"`, `"n": null`,
`"courses": []`, `"needs_review": false`, with the requirement carried only in
a prose constraint and source.prose. `info` denotes advisory/policy prose that
is never required, so the three-course elective requirement is dropped from
the machine-readable requirements.

**Smallest correct representation**: a `category_count` rule with `"n": 3` and
`"needs_review": true` (membership is genuinely unenumerated on this page —
it lives in an external "Breadth of Arts elective courses" list), with the
"at least one of the three must be upper-division" rider carried as a
constraint/note.
