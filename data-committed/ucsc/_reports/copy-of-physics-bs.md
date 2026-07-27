# copy-of-physics-bs (Physics B.S.) — verification failures

## 1. General Major — Electives (kind `electives`)

**Page says**:

```
[h4 sc-level-2] Electives
  P: Three additional 5-credit courses chosen from PHYS 100 - PHYS 180 or ASTR 111 - ASTR 118. In some cases, with the approval of the department, one of the elective requirements may be satisfied by an upper-division science or engineering course.
```

**JSON has**: a single `"op": "info"` rule (no courses, no n). `info` is
advisory-only, so the required three-elective count is not represented as a
requirement.

**Smallest correct representation**: `"op": "range"`, `"n": 3`, with a filter
including the series ranges PHYS 100-180 and ASTR 111-118 (department-approval
substitution kept as a note). `category_count` n=3 with `needs_review` would
also be acceptable, but plain `info` is not.

## 2. Quantum Information Science Concentration — Electives section missing

**Page says** (inside the "Quantum Information Science Concentration" H2):

```
[h3 sc-level-1] Electives
  P: One additional 5-credit physics course that has not been used to satisfy any other requirement for the major, chosen from PHYS 100 - PHYS 180 .
```

**JSON has**: no Electives section at all under
`"concentration": "Quantum Information Science Concentration"`. The paragraph
was misplaced into `requirements.info_sections` (title "Electives"), where it
is display-only and attributed to no concentration.

**Smallest correct representation**: a section
`{"concentration": "Quantum Information Science Concentration", "kind":
"electives"}` with one rule `"op": "range"`, `"n": 1` (include PHYS 100-180;
no-double-count rider as a note), or `category_count` n=1 with `needs_review`.

## 3. Quantum Information Science Concentration — DC Requirement operator

**Page says**:

```
[h3 sc-level-1] Disciplinary Communication (DC) Requirement
  P: ... satisfy the DC requirement by completing one of the following options:
[h4 sc-level-2] Either this course:
    * PHYS 182
[h4 sc-level-2] Or these courses:
    * PHYS 195A
    * PHYS 195B
```

**JSON has**: three disjoint pieces — a DC `info` rule with only the prose; a
separate section "Either this course:" (`kind": "other"`) with `all_of`
[PHYS182]; and a separate section "Or these courses:" (`kind`: "other") with
`"op": "unknown"`, `needs_review: true` for [PHYS195A, PHYS195B]. The
either/or choice is not represented, and read literally both PHYS 182 and the
195 pair look independently required.

**Smallest correct representation**: one DC-kind rule for the concentration
with `"op": "options"`, `"branches": [["PHYS182"], ["PHYS195A", "PHYS195B"]]`
(exactly as the General Major's DC rule already does).

## 4. Transfer Admission Screening — winter-quarter rule operator

**Page says**:

```
[h5 sc-level-3] Students entering UC Santa Cruz in the winter quarter must complete
    * PHYS 5D
    * MATH 23B
  NOTE: in addition to the requirements for students entering in the fall quarter. ...
```

**JSON has**: `"op": "unknown"`, `"needs_review": true` for
[PHYS5D, MATH23B]. "Must complete" both courses is a plain conjunction.

**Smallest correct representation**: `"op": "all_of"` with the
"in addition to the fall requirements" text kept as a note.

Everything else matches the page: General Major lower-division one_of/all_of
rules, upper-division all_of 9 + PHYS 110B/139B one_of, General DC options,
both Comprehensive rules (PHYS 134 / PHYS 138), QIS lower-division rules, and
the QIS upper-division all_of 11 (PHYS 150/CSE 109 carried as primary code)
plus PHYS 156/157 one_of.
