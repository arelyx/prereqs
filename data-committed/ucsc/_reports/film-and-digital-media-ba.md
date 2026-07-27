# film-and-digital-media-ba — verification failures

## General Film and Digital Media Major — Electives (kind `electives`)

**Page says**:

```
[h4 sc-level-2] Electives
  P: Five (5-credit) upper-division elective courses are to meet the following criteria:
  LI: Five courses total, in any combination of 5-credit critical studies ( FILM 145 , FILM 160 , FILM 180 series), production ( FILM 150 , FILM 170 series), and/or additional Core Curriculum courses ( FILM 130 /FILM 132/FILM 134/FILM 136 course, taken after its respective Core Curriculum requirement has been satisfied). FILM 185F (a two-credit course) is excluded from this list.
  LI: A maximum of two upper-division electives may be taken in another department or at another institution if pre-approved by the Film and Digital Media Department.
```

**JSON has**: a single rule with `"op": "info"`, `"n": null`,
`"needs_review": false` — only the first prose line, and the two LI criteria
(including the count of five and the FILM 185F exclusion) are dropped
entirely. `info` is advisory-only, so the required five-elective count is not
represented.

**Smallest correct representation**: one rule with `"op": "range"`, `"n": 5`
and a filter including the FILM 145/150/160/170/180 series plus the
FILM 130/132/134/136 core courses and excluding FILM 185F (substitution
maximum kept as a note); or `"op": "category_count"`, `"n": 5`,
`"needs_review": true` with the criteria as notes. (Compare the Integrated
Critical Practice Concentration Electives in the same file, which correctly
use `n_of` 2 and `n_of` 3.)

No other discrepancies: major qualification (FILM 20A plus pick-one of
20B/20C/20P as options), both lower-division sections, the general-major core
(FILM 120, n_of_groups 3-of-4 with group pools), diversity one_of, senior
comprehensive one_of, both DC sections (one from each category), the ICPC
upper-division groups (one from each of five), ICPC electives (2 critical
studies + 3 production), and both comprehensive sections all match the page.
