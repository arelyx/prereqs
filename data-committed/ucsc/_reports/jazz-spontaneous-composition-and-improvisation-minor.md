# jazz-spontaneous-composition-and-improvisation-minor — verification failures

## Section: Lower-Division Theory

**What the page says** (rendered snapshot):

```
[h4 sc-level-2] Lower-Division Theory
  P: While MUSC 14 , Beginning Western Theory and Musicianship, is the recommended starting place for students with only some prior music theory experience, students may test out of MUSC 14 by placing directly into MUSC 30A , Theory, Literature and Musicianship I, via the Music Theory Placement Exam. ... If a student places into MUSC 30A via the exam, they are not required to take MUSC 14 .
    * MUSC 14
    * MUSC 30A
```

i.e. MUSC 14 and MUSC 30A are required theory courses, with MUSC 14 waivable
via the placement exam.

**What the JSON has**: `"op": "info"`, `"n": null` with `courses: ["MUSC14",
"MUSC30A"]`. `info` denotes advisory prose that is never required, so the
lower-division theory requirement (MUSC 30A at minimum) is dropped from the
machine-readable requirements.

**Smallest correct representation**: `all_of` over `["MUSC14", "MUSC30A"]`
with the test-out waiver ("students may test out of MUSC 14 by placing
directly into MUSC 30A") carried as a note — the same pattern used for
CSE 20's test-out note elsewhere in the corpus.

## Section: Jazz Ensembles

**What the page says**:

```
[h3 sc-level-1] Performing Ensembles
  P: Students ... are required to take six quarters of performing ensembles: at least three quarters of a jazz-focused ensemble ( MUSC 3 or MUSC 164 ), and three completely elective ensembles. Both MUSC 3 and MUSC 164 can be repeated for credit.

[h4 sc-level-2] Jazz Ensembles
  P: Take three quarters of MUSC 3 and/or MUSC 164 . If a student elects to take two quarters of MUSC 3 instead of MUSC 74 or MUSC 20C , they are only required to do one additional quarter of a jazz ensemble, plus the three quarters of elective ensembles.
    * MUSC 3
    * MUSC 164
```

i.e. three quarters drawn from MUSC 3 / MUSC 164 (repeats allowed).

**What the JSON has**: `"op": "all_of"`, `"n": null` over `["MUSC3",
"MUSC164"]` — requiring one quarter each of both ensembles (2 courses),
neither matching the stated count of three nor the and/or choice.

**Smallest correct representation**: `n_of`, `n: 3`, over `["MUSC3",
"MUSC164"]` (repeatability counted as n distinct picks is the in-scope
approximation), with the two-quarters-of-MUSC 3 substitution rider kept as a
note. (The sibling Elective Ensembles rule already uses exactly this
`n_of`/`n: 3` pattern and is correct.)
