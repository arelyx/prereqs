# jewish-studies-ba — verification failures

## 1. Lower-Division Courses — Language Requirement

**Page says**:

```
[h5 sc-level-3] Language Requirement
  P: Three quarters of lower-division instruction (or equivalent) in a Jewish language in any combination of the student’s choosing:
    * HEBR 1
    * HEBR 2
    * HEBR 3
    * HEBR 4
    * HEBR 80
    * YIDD 1
    * YIDD 2
    * YIDD 3
```

**JSON has**: `"op": "all_of"` over all eight courses with `"n": null`, which
would require every listed course. The page requires three courses chosen in
any combination from the pool.

**Smallest correct representation**: `"op": "n_of"`, `"n": 3` over the same
eight courses (placement-exam prose kept as a note).

## 2. Electives

**Page says**:

```
[h4 sc-level-2] Electives
  P: Four additional Jewish studies courses of the student's choice, three of which must be 5-credit upper-division courses.
  P: The following courses are electives only. However, students may also satisfy the elective requirement by taking additional language, lower-division core, or upper-division core courses from the Jewish Studies curriculum listed above.
    * HIS 2A
    ... (23 courses)
```

**JSON has**: `"op": "list"`, `"n": null`, count only in a prose constraint.
`list` requires a counting parent and there is none, so the count of four is
unrepresented.

**Smallest correct representation**: `"op": "category_count"`, `"n": 4`,
`"needs_review": true` (pool is open-ended since language/core courses may
also count), with the "three of which must be upper-division" rider as a
constraint/note. `n_of` 4 over the listed pool plus a note would also be
acceptable.

## 3. Disciplinary Communication (DC) Requirement — exit seminar branch

**Page says**:

```
[h5 sc-level-3] Choose an exit seminar
  P: One quarter; choose one of the following courses:
    * HIS 190G ... LIT 190Y   (9 courses, choose one)
[h5 sc-level-3] Or a thesis
  P: Two quarters; all-of-the-following-courses:
    * JWST 195A
    * JWST 195B
```

**JSON has**: one `"op": "options"` rule with branches
`[[HIS190G, HIS194L, HIS194V, HIS196E, HIS196G, HIS196M, HIS196N, HIS196S,
LIT190Y], [JWST195A, JWST195B]]`. Branches are AND-packages, so the first
branch reads as "take all nine exit seminars", but the page says choose one.

**Smallest correct representation**: `"op": "section_choice"` with two
subrules — `one_of` over the nine seminar courses, and `all_of`
[JWST195A, JWST195B]. (Equivalently, options with each seminar as its own
single-course branch plus the two-course thesis branch.)

## 4. Comprehensive Requirement — same defect as item 3

The Comprehensive Requirement section repeats the identical seminar/thesis
structure and the JSON repeats the identical mis-representation (nine-seminar
AND-branch). Same correction as item 3.

Correct elsewhere: lower-division core one_of rules, upper-division n_of 4 of
26 core courses, and the Classical Chronological Distribution one_of of 8 all
match the page.
