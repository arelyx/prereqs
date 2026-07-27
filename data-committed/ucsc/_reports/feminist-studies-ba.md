# feminist-studies-ba — verification failures

## Section: Comprehensive Requirement

**What the page says** (rendered snapshot):

```
[h4 sc-level-2] Comprehensive Requirement
  P: Comprehensive requirement options include a senior seminar taught by core faculty or a senior thesis/project. Completion of the Entry Level Writing and Composition Requirements are prerequisites to FMST 194 and FMST 195 .
  P: Students who wish to complete FMST 195 , Senior Thesis or Project, should consult early with the feminist studies advisor and a prospective faculty advisor. The senior thesis or project option is by petition only, ...
    * FMST 194A
    ... (16 more FMST 194x seminars) ...
    * FMST 195
    * CRES 190A /FMST 194S
    ... (4 more CRES 190x cross-lists) ...
```

i.e. complete one option: a senior seminar (any FMST 194x / CRES 190x
cross-list) or the senior thesis/project (FMST 195).

**What the JSON has**: `"op": "unknown"`, `"n": null`, `"needs_review": true`
over the (correct) 22-course list. `unknown` is not a valid requirement
operator, so the comprehensive requirement is not machine-interpretable even
though the page determines it: one course from the list.

**Smallest correct representation**: `"op": "one_of"` over the same 22
courses (thesis-by-petition-only rider kept as a note/constraint), with
`needs_review: false`.

## Section: Electives (secondary)

**What the page says**:

```
[h4 sc-level-2] Electives
  P: Students complete seven additional 5-credit upper-division electives. Courses may be chosen from FMST 100 -199, or the lists of approved electives from affiliated departments below. As stated in the Course Substitution Policy, a minimum of five courses used toward major requirements must be taken in the feminist studies program at UC Santa Cruz (i.e. courses designated FMST). FMST 193 , 198, and 199 do not count toward this five-course minimum. ...
```

FMST 193/198/199 are excluded only from the five-FMST-course *minimum*, not
from elective eligibility (the eligible pool is all of FMST 100-199 plus the
approved lists).

**What the JSON has**: `range`, `n: 7`, `include_ranges` FMST 100-199 with
`exclude_codes: ["FMST193"]`. The exclude code does not match the prose: it
removes FMST 193 from the elective pool entirely (while inconsistently leaving
198/199 in), when the page only bars it from the five-course FMST minimum.

**Smallest correct representation**: drop `FMST193` from `exclude_codes`
(empty filter exclusions) and keep the five-course-minimum rider, including
the FMST 193/198/199 carve-out, as constraint/note text. (n=7, the FMST
100-199 range, and the four approved-elective `list` pools all match the
page.)
