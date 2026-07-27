# biology-ba — verification failures

## Section: Electives

**What the page says**:

```
[h4 sc-level-2] Electives
  P: Four additional BIOE courses numbered 100 - 179 of 5 or more credits , or the following courses:
    * BIOL 100
    * BIOL 101
    * METX 100
    * METX 100L
    * METX 115
    * METX 133
    * METX 150
```

**What the JSON has**: a single rule with `"op": "list"`, `"n": null`, courses =
the seven enumerated codes. There is no counting parent anywhere in the file,
so the stated count of **four** is lost, and the "BIOE courses numbered
100-179 of 5 or more credits" pool is not represented (only carried in
source.prose).

**Smallest correct representation**: an `n_of`/`range` rule with `n: 4` whose
filter includes the range BIOE 100-179 plus the seven listed codes (BIOL 100,
BIOL 101, METX 100, METX 100L, METX 115, METX 133, METX 150), with the
"5 or more credits" rider as a constraint note.

## Section: Comprehensive Requirement

**What the page says**:

```
[h4 sc-level-2] Comprehensive Requirement
  P: ... This requirement can be satisfied in one of the following ways:
  LI: receiving a passing grade in an independent research course, or field/laboratory course listed below; or
  LI: completing a senior thesis.
[h5] Comprehensive courses offered by Ecology and Evolutionary Biology  (39 courses)
[h5] Other Comprehensive Course Options  (METX 100L, METX 135L, CRSN 152)
```

**What the JSON has**: a `section_choice` rule whose prose omits the two LI
options, followed by two course-list rules with `"op": "unknown"` and
`needs_review: true`. `unknown` is not a valid operator in the schema
vocabulary (all_of / one_of / n_of / options / n_of_groups / range /
section_choice / list / category_count / info), and the **senior thesis**
alternative is missing from the file entirely.

**Smallest correct representation**: keep the `section_choice` parent (with
the two LI branches in its prose/notes); make the two course lists `one_of`
rules (choose one comprehensive course), and add a rule (e.g.
`category_count` n=1 with needs_review, or a note-bearing branch) for the
senior-thesis alternative.

## Section: Transfer Admission Screening Policy (recommended-courses subrule)

**What the page says** (h5 under the screening policy):

```
  P: In addition, the following courses are recommended prior to transfer to ensure timely graduation.
    >> NARRATIVE MARKER [either-this-course]: ''
    * CHEM 3BL
    >> NARRATIVE MARKER [or-this-course]: ''
    * CHEM 4AL
    >> NARRATIVE MARKER [and]: ''
    * PHYS 6A
    >> NARRATIVE MARKER [one-of-these-courses]: ''
    * STAT 5
    >> NARRATIVE MARKER [or-these-courses]: ''
    * STAT 7
    * STAT 7L
```

**What the JSON has**: a required `"op": "options"` rule with branches
`[[CHEM3BL],[CHEM4AL],[STAT5],[STAT7,STAT7L]]` and courses `[PHYS6A]`. Two
problems: (1) this is explicitly *recommended* (advisory) content and should
be `info`, not a required rule; (2) the branch partitioning does not match
the narrative markers — as encoded it requires PHYS 6A plus only one of
{CHEM 3BL, CHEM 4AL, STAT 5, STAT 7+7L}, whereas the page groups it as
(CHEM 3BL or CHEM 4AL) and PHYS 6A and (STAT 5 or STAT 7+STAT 7L).

**Smallest correct representation**: an `info` rule carrying the recommended
courses in prose (advisory content is never required).
