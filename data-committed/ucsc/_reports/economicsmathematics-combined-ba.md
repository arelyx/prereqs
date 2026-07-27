# economicsmathematics-combined-ba — verification failures

## Electives (section "Electives", kind `electives`)

**Page says**:

```
[h4 sc-level-2] Electives
  P: Students complete five electives. Two courses in economics and three in mathematics, as follows:
[h5 sc-level-3] Economics Electives
  P: Choose two from the following:
    * ECON 101
    ... (38 courses)
[h5 sc-level-3] Mathematics Electives
  P: Choose three from the following:
  P: Note: Lecture/lab combinations (i.e., MATH 145 and MATH 145L , MATH 148 and MATH 148L ) count as one course.
    * AM 114
    ... (19 courses)
```

**JSON has**: a parent rule with `"op": "info"` (count only in prose) and two
child rules with `"op": "list"`, `"n": null`. `list` is a pool drawn from by a
counting parent, but the parent is `info`, so the stated counts (two
economics, three mathematics, five total) are not represented in any
operator/count field.

**Smallest correct representation**: Economics Electives rule as
`"op": "n_of"`, `"n": 2`; Mathematics Electives rule as `"op": "n_of"`,
`"n": 3` (same course pools; lecture/lab pairing note kept as a note).
Alternatively a counting parent (`n_of` over the two `list` children) with
per-list ns. Course membership of both pools is correct (cross-listed
ECON 128/160A/166A/166B/169/183 carried as primary codes, fine).

No other discrepancies: transfer screening (calculus one_of + ECON 1/2 all_of
with 2.8-GPA prose), major qualification all_of (ECON 1, ECON 2, MATH 19A),
lower-division rules (incl. MATH 22 vs MATH 23A+23B options and STAT 17/17L),
upper-division rules, section_choice DC (Option 1: ECON 104/197; Option 2:
MATH 100 plus MATH 194/195), and the comprehensive core all match the page.
