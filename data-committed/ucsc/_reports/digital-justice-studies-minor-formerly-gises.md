# digital-justice-studies-minor-formerly-gises — verification failures

## 1. Lower-Division Courses: SOCY 30A recorded as `info` (requirement dropped)

**Page says** (rendered source):

```
[h3 sc-level-1] Lower-Division Courses
  P: Lower-division preparation:
    * SOCY 30A
```

**JSON has**: `"op": "info"` with `courses: ["SOCY30A"]`. `info` is advisory/never
required, so the SOCY 30A requirement is lost.

**Smallest correct representation**: `"op": "all_of"` with courses ["SOCY30A"].

## 2. Upper-division advanced coursework: three-elective requirement recorded as `info`

**Page says**:

```
[h4 sc-level-2] Upper-division advanced coursework:
  P: Three additional upper-division electives of 5 credits or more are required, selected from the Sociology Department elective courses (Sociology 110-189), or from the list of pre-approved courses . ...
```

**JSON has**: `"op": "info"`, `n: null`, no courses/filter — the required count (3) and
the SOCY 110-189 range are not captured; the rule is advisory only.

**Smallest correct representation**: a `range` rule with `n: 3` and a filter including
SOCY 110-189 (external "pre-approved courses" list and director-approval path carried in
notes), or `category_count` with `n: 3` and `needs_review: true`.

## 3. Project practicum: SOCY 196G recorded as `info` (requirement dropped)

**Page says**:

```
[h4 sc-level-2] Project practicum:
  P: Students must enroll in SOCY 196G , Project Practicum, and complete their DJS capstone project. ...
```

**JSON has**: `"op": "info"` with `courses: []` — the required SOCY 196G capstone
enrollment is advisory only.

**Smallest correct representation**: `"op": "all_of"` with courses ["SOCY196G"], keeping
the capstone-project prose in notes/constraints.
