# FAIL report: east-asian-studies-minor

## 1. "Upper-Division Chinese or Japanese Language" — cross-language mixing allowed (should be two from a SINGLE language)

**Page says**:

```
[h4 sc-level-2] Upper-Division Chinese or Japanese Language
  P: All East Asian studies minors are required to complete two 5-credit
     upper-division courses in Chinese language instruction OR two 5-credit
     upper-division courses in Japanese language instruction.
[h5] Chinese Language Courses -> CHIN 103, 104, 105, 107, 108
[h5] Japanese Language Courses -> JAPN 103, 104, 105, 109
```

The two courses must both come from the same language.

**JSON has**: a single `n_of` (n=2, `from_following_lists: true`) drawing from
BOTH `list` children (Chinese and Japanese). This is satisfiable by one Chinese
+ one Japanese course (e.g. CHIN 103 + JAPN 103), which the page forbids.

**Smallest correct representation**: `n_of_groups` (choose 1 group, that group
requiring 2) or an `options` rule with two branches, each an `n_of` (n=2) over a
single language list.

## 2. "Upper-Division Electives" — required count of three not represented

**Page says**:

```
[h4 sc-level-2] Upper-Division Electives
  P: Three additional 5-credit upper-division courses from the East Asian
     studies curriculum, one of which may be a topically appropriate individual
     study: CHIN 199, HIS 199, JAPN 199, LIT 199, etc.
    * ANTH 130C ... * SOCY 128J /LGST 128J   (61 courses)
```

Three courses must be chosen from the list.

**JSON has**: a single bare `"op": "list"` rule (n=null) with the 61-course
pool and no counting parent. The membership is correct, but "Three ... courses"
(n=3) is not encoded anywhere — nothing requires choosing 3.

**Smallest correct representation**: an `n_of` (n=3) counting parent drawing
from this `list` (as done for the CS B.A. Electives section).
