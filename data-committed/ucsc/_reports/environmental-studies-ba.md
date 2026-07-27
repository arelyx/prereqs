# environmental-studies-ba — verification failures

## Sections: Disciplinary Communication (DC) Requirement (General Major, GIS, Global Environmental Justice, Conservation Science and Policy)

### Required DC course rule left as op "unknown"

Page says (identically in all four DC sections):

> [h5] The DC requirement in environmental studies is satisfied by completing
>     * ENVS 100
>     * ENVS 100L

JSON has, in each of the four DC sections:

```json
"op": "unknown", "needs_review": true, "courses": ["ENVS100", "ENVS100L"]
```

"unknown" is not a valid operator; the page plainly requires both courses.
Smallest correct representation: `"op": "all_of"` over ENVS 100 and ENVS 100L.

## Sections: Electives (General Major, GIS) — social sciences list left as op "unknown"

Page lists "Environmental studies electives based in the social sciences:"
as a plain pool of 20 courses (ENVS 110 ... ENVS 178). JSON has
`"op": "unknown", "needs_review": true` for these list rules in the General
Major and GIS electives sections. Smallest correct representation:
`"op": "list"` (a pool referenced by the counting parent), matching how other
elective sublists should be treated. (The parallel natural-sciences list is
coded `one_of`, which should also be `list`; the "at least one from each
list" riders from the page's LI lines are not carried anywhere in the General
Major section.)

## Sections: Electives (all four) — range filter omits ENVS 183A and ENVS 195A

Page says (General Major; GIS/GEJ/CSP analogous with n=4/3/2):

> P: Students take seven, 5-credit or more upper-division electives from ENVS 101-179, ENVS 183A , and ENVS 195A . Students cannot take both ENVS 183A and ENVS 195A .

JSON `range` rules (n=7 general, n=4 GIS, n=3 GEJ "Plus three additional
upper-division electives", n=2 CSP) have a filter with only
`include_ranges: [ENVS 101-179]` and empty `exclude_codes`/`include_series`
— ENVS 183A and ENVS 195A are missing from the stated pool, and the
183A/195A mutual-exclusion ban is not carried in `constraints`/`notes`
(only inside `source.prose`).

Smallest correct representation: add ENVS 183A and ENVS 195A as include
codes on each filter and carry the "cannot take both" ban as a constraint.

## Section: Upper-Division Courses (Conservation Science and Policy) — Field course

Page says:

> [h6] One of the following field courses:
>     * ENVS 104A ... * BIOE 163L   (31 courses)
> [h6] Or the CEC field course
>   P: Or the California Ecology and Conservation (CEC) field course through the University of California Natural Reserve System (XENV 188).

JSON has the field-course rule as:

```json
"op": "options", "branches": [[<all 31 courses in one branch>], []]
```

Under `options` semantics the first branch requires all 31 courses together,
and the second branch is empty (satisfiable by nothing). There is also no
rule or note representing the CEC (XENV 188) alternative under the
`section_choice` parent.

Smallest correct representation: under the "Field course" `section_choice`,
(a) a `one_of` over the 31 listed courses, and (b) an `info`/`category_count`
rule (or note) for the XENV 188 CEC field course alternative.
