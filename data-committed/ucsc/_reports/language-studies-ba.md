# language-studies-ba — verification failures

## Section: Comprehensive Requirement — Option 3 fabricated count

**What the page says**:

```
[h5 sc-level-3] Option 3: Graduate-Level Course
  P: By exception, students in their senior year may enroll in a graduate-level
     linguistics class ... a graduate-level course may ... satisfy the senior
     exit requirement.
```

One graduate-level linguistics course satisfies the senior exit requirement.
No count of three appears anywhere on the page.

**What the JSON has**: `"op": "category_count"`, `"n": 3`, `courses: []`.
The n=3 is not supported by the page (the requirement is a single
graduate-level course).

**Smallest correct representation**: `"op": "category_count"`, `"n": 1`,
`"needs_review": true` (graduate-level linguistics classes are an
unenumerated category).

## Section: Electives — required five-course requirement dropped to info

**What the page says**:

```
[h4 sc-level-2] Electives
  P: The major requires five 5-credit upper-division elective courses.
     Courses may be chosen from:
  LI: LING 102-189 (excluding LING 111 and LING 112)
  LI: LING 200-289 (one of which could satisfy the senior comprehensive)
  LI: The list of approved cultural context courses
  LI: Additional advanced language courses listed above
```

Five upper-division electives are required.

**What the JSON has**: a single rule with `"op": "info"`, `"n": null`,
`courses: []`, with the requirement carried only as `source.prose`. `info`
denotes advisory prose that is never required, so the five-elective
requirement is dropped from the machine-readable requirements.

**Smallest correct representation**: `"op": "category_count"`, `"n": 5`,
`"needs_review": true` (the pool is range-based / defined by a separate
approved-cultural-context list, i.e. genuinely unenumerated). Compare the
parallel CRES B.A., where the analogous five-elective requirement is modeled
as `category_count` n=5.

## Section: Upper-Division — "Advanced Language Course" requirement dropped to info

**What the page says**:

```
[h5 sc-level-3] Advanced Language Course
  P: For students concentrating in French, Italian, or Spanish, one 5-credit
     advanced language course is required. For students concentrating in
     Chinese or Japanese, two 5-credit advanced language courses are required ...
```

At least one upper-division advanced language course in the language of
concentration is required (two for Chinese/Japanese), with membership defined
by per-language ranges (e.g. CHIN 100-199, FREN 111-114 and 120-199, etc.).

**What the JSON has**: `"op": "info"`, `"n": null`, `courses: []` — the
requirement is carried only as prose, so it is dropped from the
machine-readable requirements.

**Smallest correct representation**: a required rule (e.g.
`category_count`/`range`, `needs_review: true`) for the advanced language
course, with the concentration-dependent count (1, or 2 for Chinese/Japanese)
carried as a constraint rider.
