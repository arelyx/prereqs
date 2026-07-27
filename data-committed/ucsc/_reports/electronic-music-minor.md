# electronic-music-minor — verification failures

## Section: Upper-Division Lecture/Seminar Electives

**What the page says**:

```
[h4 sc-level-2] Upper-Division Lecture/Seminar Electives
  P: Take four (4) of the following courses. ...
    * MUSC 105H, MUSC 123A, MUSC 123B, MUSC 123C, MUSC 150N, MUSC 150P,
      MUSC 150R, MUSC 150Z, MUSC 206B, MUSC 206C, MUSC 254A
```

**What the JSON has**: `"op": "list"`, `"n": null`. A `list` is a pool drawn
from by a counting parent, but no counting parent exists in this file — the
required count of **four** is not represented anywhere machine-readable.

**Smallest correct representation**: `"op": "n_of"`, `"n": 4` over the same
11 courses (membership is correct), keeping the MUSC 123A test-out and
MUSC 105X/254A double-count-ban prose as notes/constraints.

## Section: Upper-Division Workshop/Ensemble Electives

**What the page says**:

```
[h4 sc-level-2] Upper-Division Workshop/Ensemble Electives
  P: Take three (3) of the following courses. All courses in list, except MUSC 167R , can be repeated for credit.
    * MUSC 73, MUSC 129, MUSC 167, MUSC 167R, MUSC 267
```

**What the JSON has**: `"op": "list"`, `"n": null` — the required count of
**three** is lost (no counting parent exists).

**Smallest correct representation**: `"op": "n_of"`, `"n": 3` over the same
5 courses, with the repeatability prose kept as a note (repeatability
counting itself is an in-scope approximation).
