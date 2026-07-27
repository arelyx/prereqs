# mathematics-bs — verification failures

## Section: Electives

**What the page says**:

```
[h4 sc-level-2] Electives
  P: Three Electives are Required. Elective courses are chosen from MATH courses numbered 101-190 or the approved list from other departments. Courses must be 5 credits or more, and only two of the three courses can be from the approved list of courses from other departments. ... Recommended electives from the Mathematics Department are below.
    * MATH 101 ... MATH 181   (21 recommended courses)
[h5] Approved Elective Courses from Other Departments:
    * AM 107 /PHYS 107, AM 114, AM 147, BME 118, STAT 108, STAT 131, STAT 132
```

**What the JSON has**: `"op": "n_of"`, `"n": 3`, `from_following_lists: true`,
with the pool = the 21 *recommended* MATH courses plus the 7 approved
other-department courses (a `list` rule). The actual elective pool per the
prose is **any MATH course numbered 101-190** (5+ credits) or the approved
list — the 21-course list is explicitly only "Recommended electives". As
encoded, valid electives in MATH 101-190 outside the recommended list are
rejected.

**Smallest correct representation**: a `range` rule with `n: 3`,
`include_ranges: [{subject: "MATH", lo: 101, hi: 190}]`, plus the seven
approved codes (AM 107, AM 114, AM 147, BME 118, STAT 108, STAT 131,
STAT 132) as included codes; keep the "only two from the approved list" and
"5 credits or more" riders as constraints and the recommended list as a
note.

All other sections (Transfer Screening, Major Qualification, Lower-Division,
Upper-Division, DC, Comprehensive) match the page.
