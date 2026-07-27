# education-democracy-and-justice-ba — verification failures

## Section: Electives — wrong count on the EDUC 102-187 range rule

**What the page says**:

```
[h4 sc-level-2] Electives
  P: Beyond the two foundational required courses above, students take six, 5-credit electives from EDUC 102 –187. ...
```

**What the JSON has**: a `range` rule with `"n": 2` and filter
`{"include_ranges": [{"subject": "EDUC", "lo": 102, "hi": 187}]}`.

The page's stated count is **six**; the JSON requires two.

**Smallest correct representation**: the same `range` rule with `"n": 6`
(topic-area lists and Outside Electives feeding it as pools).

## Section: Electives — "Social Contexts and Educational Foundations" encoded as all_of

**What the page says**:

```
[h5 sc-level-3] Social Contexts and Educational Foundations
  P: EDUC 110 is required
    * EDUC 102
    * EDUC 128
    ... (12 courses) ...
    * CRES 121 /EDUC 121
```

This is a topic-area grouping of the six electives ("The course lists below
separate these education courses by topic area"), i.e. a pool, not a block of
required courses.

**What the JSON has**: `"op": "all_of"` over all 12 courses — which would
require every course in the list.

**Smallest correct representation**: `"op": "list"` (a pool drawn from by the
six-elective counting parent), with the "EDUC 110 is required" emphasis note
carried as prose/notes.

## Section: Electives — "Learning and Teaching" has invalid operator

**What the page says**: the parallel topic-area pool (17 courses, "EDUC 180
is required" prose).

**What the JSON has**: `"op": "unknown"`, `"needs_review": true`. `unknown`
is not a valid operator in the schema vocabulary (all_of / one_of / n_of /
options / n_of_groups / range / section_choice / list / category_count /
info).

**Smallest correct representation**: `"op": "list"` (pool for the
six-elective counting parent).

## Section: Major Qualification — invalid operator on a required rule

**What the page says**:

```
[h4 sc-level-2] Major Qualification
  P: To qualify to declare the EDJ major, students must have:
  LI: Attended an ... Major Workshop or meet with the advisor
  LI: Completed EDUC 10 , Introduction to Education, and EDUC 60 , Schooling, Democracy, and Justice. ...
    * EDUC 10
    * EDUC 60
```

**What the JSON has**: `"op": "unknown"`, `"needs_review": true`, courses
`["EDUC10", "EDUC60"]`. Both courses are required to qualify, but `unknown`
is not a valid operator, so the qualification requirement has no defined
semantics.

**Smallest correct representation**: `"op": "all_of"` of EDUC 10 and EDUC 60,
with the workshop/advisor line and the concurrent-enrollment allowance as
notes.

## Sections: Transfer Admission Screening Policy / Getting Started: Transfer Students — invalid operator on advisory content

**What the page says**: EDJ is a non-screening major ("...are not required to
complete specific courses for consideration of admission"); EDUC 10 / EDUC 60
are mentioned for equivalency review and pre-declaration planning (advisory).

**What the JSON has**: both rules carry courses `["EDUC10", "EDUC60"]` with
`"op": "unknown"`, `"needs_review": true`.

**Smallest correct representation**: `"op": "info"` for both (advisory
content is never required).

## Checked and matching (not discrepancies)

Lower-division all_of (EDUC 10, EDUC 60); upper-division one_of
(EDUC 110/180) with may-take-both prose, EDUC 190 all_of; Outside Electives
`list` pool with EDUC 194 once-only note; DC (one_of EDUC 110/180 plus
EDUC 190); Comprehensive (EDUC 190; `one_of` of a single course is
semantically equivalent).
