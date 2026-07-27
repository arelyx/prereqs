# FAIL report: plant-sciences-bs

The lower-division, the four upper-division requirement groups (two core,
one ecology, one plant physiology, one botany), the DC requirement (n_of 2 over
29 courses), and the "three topical electives" (n_of 3) are all correct. The
failures below are in the general-electives and comprehensive sections.

## 1. Electives — "Three general electives" required count not represented

**Page says**:

```
[h5 sc-level-3] Three general electives chosen from the following:
[h6] Biological Sciences-EEB
  P: Any upper-division BIOE course numbered BIOE 100 - BIOE 179 of 5 or more
     credits that is not required to fulfill a different requirement group.
[h6] Biological Sciences-MCDB   -> BIOL 100, BIOL 101
[h6] Earth and Planetary Sciences -> EART 100 ... EART 105
[h6] Economics -> ECON 166A, ECON 166B
[h6] Environmental Studies -> ENVS 104A ... ENVS 168
[h6] Microbiology and Environmental Toxicology -> METX 100 ... METX 150
[h6] Ocean Sciences -> OCEA 118, OCEA 122, OCEA 130
[h6] Psychology -> PSYC 123
```

This is a second, distinct "three courses" requirement (the major needs three
topical + three general electives).

**JSON has**: the `"Three general electives chosen from the following:"` heading
as `"op": "info"` with NO counting parent. Only the "Three topical electives"
requirement carries an `n_of` (n=3); the general-electives count of 3 is not
encoded by any operator.

**Smallest correct representation**: an `n_of` (n=3) counting parent drawing
from the general-elective `list` children (mirroring the topical-electives
rule).

## 2. Electives — "Biological Sciences-EEB" general-elective range dropped to `info`

**Page says** (under "Three general electives"):

```
[h6] Biological Sciences-EEB
  P: Any upper-division BIOE course numbered BIOE 100 - BIOE 179 of 5 or more
     credits that is not required to fulfill a different requirement group.
```

**JSON has**: `"op": "info"` (advisory), with no range/category. This whole
membership pool (BIOE 100-179) is lost.

**Smallest correct representation**: a `range` filter (BIOE 100-179, >=5 credits,
excluding courses used elsewhere) or a `category_count` for the unenumerated
pool.

## 3. Electives — undergraduate-research subgroup uses wrong count (n_of n=5)

**Page says**:

```
[h6 sc-level-5] Biological Sciences-EEB
  P: Any 5 credits of undergraduate research
    * BIOE 183W
    * BIOE 183L
    * BIOE 193
    * BIOE 193F
    * BIOE 195
```

"Any 5 credits of undergraduate research" means choosing research totaling 5
credits (effectively one option), not completing all five listed courses.

**JSON has**: `"op": "n_of", "n": 5` over the five research courses — i.e.
requiring all five.

**Smallest correct representation**: `one_of` over the research courses (with the
"5 credits" rider as a constraint), consistent with the `section_choice` this
sits under.

## 4. Comprehensive Requirement — course pools left as `unknown`; choose-one and senior-thesis options not represented

**Page says**:

```
[h4 sc-level-2] Comprehensive Requirement
  P: This requirement can be satisfied in one of the following ways:
  LI: receiving a passing grade in an independent research course, or
      field/laboratory course listed below.
  LI: completing a senior thesis.
[h5] Comprehensive courses offered by Ecology and Evolutionary Biology (39 courses)
[h5] Comprehensive courses offered in other departments -> METX 100L, CRSN 152
```

Satisfied by ONE course from the combined comprehensive-course pool, OR a senior
thesis.

**JSON has**: a `section_choice` header, then both course lists as
`"op": "unknown"`, `needs_review: true`. The "choose one course" count is not
encoded, the two pools are unresolved, and the senior-thesis alternative is not
represented as a branch.

**Smallest correct representation**: an `options`/`section_choice` with a
`one_of` branch over the union of the two comprehensive-course lists and a
senior-thesis branch (thesis carried as an info/constraint branch if no course
code applies).
