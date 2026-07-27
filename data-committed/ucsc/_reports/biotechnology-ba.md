# biotechnology-ba — verification failures

## 1. Section: Upper-Division Courses / "Biotechnology Upper-Division Core" — required core coded as info

**Page says** (rendered snapshot):

```
[h5 sc-level-3] Biotechnology Upper-Division Core
    * BME 105
    * BME 110
    * BME 160
  NOTE: Students may substitute CSE 20 for BME 160 , although BME 160 is strongly recommended. CSE 20 has a test-out exam that will also be accepted.
```

This is the upper-division core of the major: all three courses are required
(the CSE 20 substitution for BME 160 is a rider).

**JSON has**: the single Upper-Division Courses rule with `"op": "info"`,
`"n": null`, courses `["BME105", "BME110", "BME160"]`. `info` denotes
advisory prose that is never required, so the entire three-course core is
dropped from the machine-readable requirements.

**Smallest correct representation**:

```json
{"op": "all_of", "courses": ["BME105", "BME110", "BME160"]}
```

with the CSE 20-for-BME 160 substitution kept as a note (accepted
approximation).

## 2. Section: Electives — count of three lost (op `list` with no counting parent)

**Page says**:

> P: Three or more of the following courses must be taken to meet the
> requirement of 40 upper-division credits for the major. At least four of
> the following courses must be taken if a student completes CSE 20 instead
> of BME 160 . We recommend that two or more of the courses should be BME
> courses.

**JSON has**: `"op": "list"`, `"n": null` over the 14-course pool. There is
no counting parent rule that draws on this pool, so the required count of
three is not machine-represented anywhere; it survives only inside a prose
`constraints` entry.

**Smallest correct representation**:

```json
{"op": "n_of", "n": 3, "courses": [ ...same 14 courses... ]}
```

keeping the "four if CSE 20 replaces BME 160" and "two or more should be BME"
riders as prose constraints (accepted approximation).

## 3. Section: Major Qualification — "four of the following" coded as options; n=4 lost

**Page says**:

> P: To qualify for the biotechnology major, students must have completed
> four of the following lower-division courses:
>     * BIOL 20A
>     * BME 5
>     * BME 18
>     * BME 80G /PHIL 80G
>     * BME 80H
>     * CHEM 3A
>     * CSE 20
>     * ECE 80B
>     >> NARRATIVE MARKER [either-this-course]: '' * STAT 5
>     >> NARRATIVE MARKER [or-these-courses]: '' * STAT 7 / STAT 7L

**JSON has**: `"op": "options"` with the eight courses in `courses` and
`branches` `[["STAT5"], ["STAT7", "STAT7L"]]`, `"n": null`. `options` means
"complete one branch", which is not what the page says, and the stated count
of four is not recorded anywhere.

**Smallest correct representation**: an `n_of` rule with `"n": 4` over the
qualification pool (the STAT 5 vs STAT 7+7L alternative counting as one of
the four, e.g. carried as a branch/nested option or a prose note).
