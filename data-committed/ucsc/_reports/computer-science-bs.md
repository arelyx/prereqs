# computer-science-bs — verification failures

## Section: Electives / "List of B.S. electives:" — CSE range membership and CSE 195 dropped from the pool

**Page says** (rendered snapshot):

```
[h4 sc-level-2] Electives
  P: Four courses must be completed from the list below . At least one course must be a computer science and engineering course. ...

[h5 sc-level-3] List of B.S. electives:
  LI: Any 5-credit or more CSE course with a number between 100 and 189, except for the DC courses CSE 115A and CSE 185E /CSE 185S.
  LI: Any 5-credit or more CSE course with a number between 201 and 279. Approval for courses with numbers 290 and above may be requested ... Courses with numbers 280-289 are not eligible. ...
  LI: CSE 195 (if not used to satisfy the DC requirement).
  LI: Any course from the following list:
    * AM 114 ... STAT 132   (25 explicit courses)
```

The elective pool has four membership sources: two CSE course-number ranges,
CSE 195, and the explicit 25-course list.

**What the JSON has**: the counting parent is correct (`"op": "n_of"`,
`"n": 4`, `"from_following_lists": true`, with the physics-substitution and
"at least one CSE" riders as prose constraints — accepted approximations).
But the only pool rule is a single `"op": "list"` containing just the 25
explicitly listed AM/CMPM/MATH/STAT courses. The two CSE ranges
(CSE 100-189 excluding the DC courses; CSE 201-279) and CSE 195 exist only
inside `source.prose` and are not machine-represented at all. Since the
"at least one course must be a CSE course" rider is real, the committed pool
cannot even satisfy the requirement as represented.

**Smallest correct representation**: add to the Electives section, alongside
the existing list rule:

```json
{"op": "range",
 "filter": {"subject": "CSE", "include": [[100, 189]],
            "exclude_codes": ["CSE115A", "CSE185E"],
            "min_credits": 5}}
{"op": "range",
 "filter": {"subject": "CSE", "include": [[201, 279]], "min_credits": 5}}
{"op": "list", "courses": ["CSE195"]}
```

(matching the `range` representation used elsewhere in the corpus, e.g.
earth-sciences-bs), keeping the "if not used to satisfy the DC requirement"
and 290-and-above petition text as notes.
