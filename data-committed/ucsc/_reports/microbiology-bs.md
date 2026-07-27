# microbiology-bs — verification failures

## Section: Electives — required count of three (min 14 credits) lost (op `list`, no counting parent)

**Page says** (rendered snapshot):

```
[h4 sc-level-2] Electives
  P: Students must complete three electives totaling a minimum of 14 credits from the following options:
    * METX 108 ... ENVS 163   (18 courses)
  NOTE: Note: Lecture/lab combinations count as one course.
```

The requirement is to complete **three** electives (min 14 credits) from the
18-course pool.

**What the JSON has**: the single Electives rule uses `"op": "list"`,
`"n": null`, with no counting parent rule drawing on the pool and no
`constraints` entry. The membership list is correct, but the required count
of three is not machine-represented anywhere; it survives only in
`source.prose`.

**Smallest correct representation**: change the rule to a counting operator
with the stated count —

```json
{"op": "n_of", "n": 3, "courses": [ ...same 18 courses... ]}
```

keeping the "minimum of 14 credits" and "lecture/lab combinations count as
one course" riders as notes/constraints (accepted approximations).

(This is the same defect class flagged in applied-linguistics-and-
multilingualism-ba and biotechnology-ba.)
