# science-education-bs — verification failures

All failures are in the **Electives** section (the two-field specialization
requirement). The rest of the file matches the page.

## Section: Electives — two-of-four-fields requirement not represented

**What the page says**:

```
[h4 sc-level-2] Electives
  P: All the courses from any two of the following fields must be completed:
[h5] Field 1: Physics        * PHYS 5D  * PHYS 102  * PHYS 133
[h5] Field 2: Chemistry      * CHEM 8A  * CHEM 8L  * CHEM 8B  * CHEM 8M
  P: And one additional 5-credit, upper-division chemistry course numbered CHEM 100 - CHEM 180. ...
[h5] Field 3: Biology        * BIOL 105  * BIOE 107  * BIOE 109
[h5] Field 4: Earth Sciences * EART 110B  * EART 110M  * OCEA 90
  P: And one additional 5-credit, upper-division EART course numbered EART 100 - EART 189.
```

**What the JSON has**:

- Parent "Electives" rule: `"op": "info"` with the two-fields sentence only
  as a prose constraint — so nothing enforces choosing two complete fields.
- Field 1: Physics — `"op": "unknown"`, `needs_review: true` (`unknown` is
  not a valid operator in the schema vocabulary).
- Field 2: Chemistry — `"op": "one_of"` over CHEM 8A/8L/8B/8M, i.e. just one
  course, where the page requires **all four** plus one additional
  upper-division CHEM 100-180 course; the additional-course range requirement
  appears only in source.prose.
- Field 3: Biology — `"op": "unknown"`, `needs_review: true`.
- Field 4: Earth Sciences — `"op": "one_of"` over EART 110B/EART 110M/OCEA 90,
  where the page requires **all three** plus one additional upper-division
  EART 100-189 course; the additional-course range requirement appears only
  in source.prose.

**Smallest correct representation**: an `n_of_groups` rule with `"n": 2` and
four group branches (or a parent choose-2 with four subrules), where:

- Physics = all_of {PHYS 5D, PHYS 102, PHYS 133}
- Chemistry = all_of {CHEM 8A, CHEM 8L, CHEM 8B, CHEM 8M} plus a `range`
  n=1 over CHEM 100-180 (recommendation notes as prose)
- Biology = all_of {BIOL 105, BIOE 107, BIOE 109}
- Earth Sciences = all_of {EART 110B, EART 110M, OCEA 90} plus a `range`
  n=1 over EART 100-189

## Checked and matching (not discrepancies)

Transfer screening n_of 6 over the 14 listed courses with the
CHEM 3-or-CHEM 4-series rider as a note (recommended-extra-courses prose is
advisory); lower-division: MATH 19A/11A and 19B/11B one_of pairs, MATH 22
all_of with waiver note, PHYS 5/6 options, CHEM 3/4 options, EART 5/10/20
options, BIOL 20A + BIOE 20B/20C all_of, ASTR one_of, STAT 5 / STAT 7+7L /
ASTR 119 options with note, EDUC 50C all_of; upper-division: EART 110A,
EDUC 100A/100C one_of, EDUC 185L + EDUC 185C all_of, EDUC 177/128/140/181
one_of; DC (EDUC 100A/100C one_of plus EDUC 185L); Comprehensive
(EDUC 185C all_of).
