# philosophy-ba — verification failures

## 1. "Plus six upper-division electives": count dropped and pool lists marked required

**Page says** (rendered source):

```
[h5 sc-level-3] Plus six upper-division electives
  P: Take six 5-credit courses numbered PHIL 100A or above, excluding PHIL 195A , PHIL 195B , and PHIL 199 .
  P: At least one must be in value theory and two in metaphysics and/or epistemology. See the lists below for approved courses.
  P: The two courses satisfying the history of philosophy requirement cannot be counted toward the six upper-division electives. ...
[h6 sc-level-4] Value Theory Courses
    * PHIL 100D /LGST 140P
    * PHIL 118 ... (9 courses)
[h6 sc-level-4] Metaphysics and Epistemology Courses
    * PHIL 106 ... (11 courses)
```

Six electives from PHIL 100A-and-above (excluding 195A/195B/199); the two h6 lists are
distribution pools ("at least one ... value theory, two ... metaphysics/epistemology"),
not required lists.

**JSON has**:
- The counting rule "Plus six upper-division electives" is `"op": "info"`, `n: null` —
  the required count of six is lost.
- "Value Theory Courses" is `"op": "all_of"` over 9 courses and "Metaphysics and
  Epistemology Courses" is `"op": "all_of"` over 11 courses — all 20 pool members are
  asserted as unconditionally required.

**Smallest correct representation**: a `range` rule with `n: 6` (include PHIL 100-199 —
"PHIL 100A or above" — exclude PHIL 195A, PHIL 195B, PHIL 199), carrying the
at-least-one-value-theory / two-M&E and no-double-count riders as constraint prose; the
two h6 lists become `"op": "list"` pools.

## 2. "Elective" (11th course) recorded as `info` (requirement dropped)

**Page says**:

```
[h5 sc-level-3] Elective
  P: An 11th 5-credit course from any level (lower, upper, or graduate).
```

(The section header confirms: "Eleven courses are required: ... and an elective course
which may be from any level.")

**JSON has**: `"op": "info"` with no n — the 11th required course disappears.

**Smallest correct representation**: `"op": "category_count"` with `n: 1` and
`needs_review: true` (membership genuinely unenumerated: any 5-credit course, any
level).
