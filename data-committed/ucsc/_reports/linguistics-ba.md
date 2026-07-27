# linguistics-ba — verification failures

## Section: Upper-Division Courses

**What the page says** (rendered snapshot):

```
[h4 sc-level-2] Upper-Division Courses
  P: Students in the linguistics major are required to complete a minimum of 10 upper-division courses (50 upper-division credits) in linguistics and related disciplines, including seven named courses in linguistics:

[h5 sc-level-3] Take the following courses:
    * LING 100
    * LING 101
    * LING 171

[h5 sc-level-3] Plus one of the following courses:
    * LING 111
    * LING 112

[h5 sc-level-3] And three of the following courses:
    * LING 102
    * LING 113
    * LING 116
    * LING 151
    * LING 172
```

i.e. all of 100/101/171, plus exactly one of 111/112, plus three of the
five-course list (3 + 1 + 3 = the seven named courses).

**What the JSON has**: a parent rule `"op": "n_of"`, `"n": 7`,
`"from_following_lists": true`, with the "Take the following courses:" rule
demoted to `"op": "list"` and the "Plus one of the following courses:" rule
demoted to `"op": "list"` (the n_of-3 child keeps its own count and is
therefore not part of the parent's pool). This loses the `all_of` on
LING 100/101/171 and the `one_of` on LING 111/112, and leaves the parent
demanding 7 courses from a 5-course pool ({100, 101, 171, 111, 112}), which
is unsatisfiable.

**Smallest correct representation**: parent as `info` (the "seven named
courses" sentence is a summary), children as `all_of` [LING100, LING101,
LING171], `one_of` [LING111, LING112], and the existing `n_of`/`n: 3` rule.

## Section: Electives

**What the page says**:

```
[h4 sc-level-2] Electives
  P: The major requires three five-credit courses chosen from LING 102-189 (excluding LING 111, LING 112, and LING 171) and/or LING 200-289 (one of which could satisfy the Senior Comprehensive). The three electives may be any combination of these two options. ...
```

**What the JSON has**: `range`, `n: 3`, with `include_ranges` `[LING
102-189]`, `exclude_codes` `[LING111, LING112, LING171]` — correct so far —
but `exclude_ranges: [{"subject": "LING", "lo": 200, "hi": 289}]`. LING
200-289 is an *allowed* elective source on the page ("and/or LING 200-289
... any combination of these two options"); the filter puts it on the exclude
side instead of adding it to `include_ranges`.

**Smallest correct representation**: move `{"subject": "LING", "lo": 200,
"hi": 289}` from `exclude_ranges` to `include_ranges` (LING 195 / instructor
permission riders stay as prose).

## Section: Comprehensive Requirement

**What the page says**:

```
[h4 sc-level-2] Comprehensive Requirement
  P: In their senior year, ... linguistics majors must satisfy the senior comprehensive requirement in one of three ways:
[h5 sc-level-3] Option 1: Capstone course
    * LING 190
[h5 sc-level-3] Option 2: Senior thesis
    * LING 195
[h5 sc-level-3] Option 3: Graduate-level course
  P: By exception, students in their senior year may enroll in a graduate-level class , by permission of instructor. ... a graduate-level course may satisfy the senior exit requirement.
```

i.e. choose ONE of three options; option 3 is a single graduate-level course.

**What the JSON has**: the parent rule is `"op": "info"`, so the three option
rules read as independent, simultaneously required rules (`one_of` [LING190]
AND `all_of` [LING195] AND the option-3 rule) instead of a choice. Option 3 is
`"op": "category_count"` with `"n": 3` — the page states one graduate-level
course, not three, and `needs_review` is `false`.

**Smallest correct representation**: parent `"op": "section_choice"` (the
pattern already used for the computer-science-ba comprehensive options), with
children `one_of` [LING190], `one_of`/`all_of` [LING195], and `category_count`
`n: 1`, `needs_review: true` for the graduate-level-course option.

## Notes (in-scope approximations, not failures)

- Foreign Language branch of the lower-division competency `section_choice`
  is carried as `info` prose (proficiency-based, "or its equivalent"
  membership); the Mathematics/Computer Science branch is correctly `n_of`
  `n: 2` with the CSE 20 test-out and STAT/PSYC substitution riders as notes.
- Qualification (LING 50 + one of LING 53/101/112/171) and DC (LING 101 +
  one of LING 111/112) match the page exactly.
