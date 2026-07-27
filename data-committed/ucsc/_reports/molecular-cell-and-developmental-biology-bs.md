# molecular-cell-and-developmental-biology-bs — verification failures

## Section: Major Qualification — "Plus these courses"

**What the page says** (rendered snapshot):

```
[h4 sc-level-2] Major Qualification
  P: To qualify for any of these majors, students must pass (with a grade of C or better) the following courses or their equivalents:
...
[h5 sc-level-3] Plus these courses
    * CHEM 8A
    * BIOL 20A
    * BIOL 20L
    * BIOE 20B
```

i.e. all four courses are required for qualification.

**What the JSON has**: `"op": "n_of"`, `"n": 2` over the four courses. No
count of two appears anywhere in this requirement on the page (the "two or
more grades of NP, C-, ..." sentence is a grade-standards rider, not a course
count), so the rule understates qualification from four required courses to
any two.

**Smallest correct representation**: `"op": "all_of"` (n null) over
`["CHEM8A", "BIOL20A", "BIOL20L", "BIOE20B"]`, keeping the grade-policy prose
as constraints.

## Section: Transfer Admission Screening Policy — "Plus these courses"

**What the page says**:

```
[h5 sc-level-3] Plus these courses
    * CHEM 8A
    * BIOL 20A
    * BIOL 20L
    * BIOE 20B
  NOTE: BIOL 20L is not required for students who have completed BIOL 20A and BIOE 20B at California community colleges.
```

**What the JSON has**: `"op": "unknown"`, `"n": null`, `"needs_review": true`.
`unknown` is not a valid requirement operator, so this required screening rule
is not machine-interpretable even though the page determines it (all four
courses, with the BIOL 20L community-college waiver as a note — which the
JSON already carries).

**Smallest correct representation**: `"op": "all_of"` over the same four
courses, `needs_review: false`, keeping the existing BIOL 20L waiver note.

## Note (secondary, same section)

Under the screening policy's "In addition, the following courses are
recommended prior to transfer..." parent (correctly `info`), the recommended
sub-rules are encoded inconsistently: MATH 11B/16B/19B as `one_of` and
STAT 7/STAT 7L as `all_of` (advisory content presented as required), while
CHEM 8B/CHEM 8L is `info`. Preferably all three follow the
recommended-content-as-`info` convention.

All degree-requirement sections (lower-division, upper-division, electives,
DC, comprehensive) match the page exactly.
