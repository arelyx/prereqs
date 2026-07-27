# community-studies-ba — verification failures

## Section: Upper-Division Courses — Core Courses

**What the page says**:

```
[h5 sc-level-3] Core Courses
  P: Complete all of the following courses:
    * CMMU 100
    * CMMU 101
    * CMMU 105A
    * CMMU 105B
    * CMMU 105C
    * CMMU 107
```

**What the JSON has**: the Upper-Division section opens with a counting parent
(`"op": "n_of"`, `"n": 3`, `"from_following_lists": true`) and the Core
Courses rule is `"op": "list"` — i.e., a pool drawn from by that counting
parent. As encoded, the six required core courses are folded into the
"choose 3" topical pool instead of all being required.

**Smallest correct representation**: Core Courses as `"op": "all_of"` with
the six courses (CMMU 100, CMMU 101, CMMU 105A, CMMU 105B, CMMU 105C,
CMMU 107), outside the scope of the n=3 topical counter. The n=3 counter
should govern only the topical-area lists (Community Studies, Anthropology,
Education, Environmental Studies, HAVC, History, LALS, Oakes, Politics,
Psychology, Sociology), which are correctly `list` rules.

## Section: Comprehensive Requirement — Senior Thesis

**What the page says**:

```
[h5 sc-level-3] Senior Thesis
  P: Outstanding students may choose to complete a senior thesis ... may enroll in the following courses for variable units in order to complete the thesis.
    * CMMU 195A
    * CMMU 195B
    * CMMU 195C
```

(The parent prose: "Each student must fulfill this requirement whether
through a Capstone Analytic Essay, a senior thesis, or a student-directed
seminar.")

**What the JSON has**: `"op": "unknown"` with `needs_review: true` on the
CMMU 195A/195B/195C rule. `unknown` is not a valid operator in the schema
vocabulary (all_of / one_of / n_of / options / n_of_groups / range /
section_choice / list / category_count / info) — the rule's semantics are
unresolved.

**Smallest correct representation**: since thesis enrollment in CMMU
195A/195B/195C is optional/variable ("may enroll ... for variable units"),
an `info` rule carrying the courses in prose; alternatively the whole
Comprehensive section as a `section_choice` over the three capstone paths
(essay = all_of CMMU 107; thesis = info/one_of over CMMU 195A-C; SDS = info).
