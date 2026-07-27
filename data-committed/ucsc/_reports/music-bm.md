# music-bm — verification failures

## Section: Upper-Division Courses — Performing Ensembles has invalid operator and lost counts

**What the page says**:

```
[h5 sc-level-3] Performing Ensembles
  P: Students must participate in performing ensembles for every quarter they are in the B.M. program, for a minimum of six (6) quarters (for transfer students), and nine (9) quarters (for frosh students).
  P: All ensembles are 2 credits each and may be repeated for credit.
  P: A maximum of one ensemble per quarter can be counted toward fulfillment of the total requirement. ...
    * MUSC 1C ... MUSC 168   (20 ensemble courses)
```

**What the JSON has**: `"op": "unknown"`, `"n": null`, `"needs_review": true`
over the 20 ensemble courses. `unknown` is not a valid operator in the schema
vocabulary (all_of / one_of / n_of / options / n_of_groups / range /
section_choice / list / category_count / info), and the stated minimum counts
(six/nine quarters) are not represented.

**Smallest correct representation**: an `n_of` rule with `"n": 9` over the
ensemble pool (repeat-counting quarters as n distinct courses is an in-scope
approximation), with the transfer-student minimum of six, the
repeatable-for-credit note, and the one-ensemble-per-quarter cap carried as
constraints/notes.

## Section: Upper-Division Courses — Individual Applied Lessons encoded as all_of

**What the page says**:

```
[h5 sc-level-3] Individual Applied Lessons
  P: Students must take applied lessons with UCSC faculty for every quarter they are in the B.M. program, for a minimum of six (6) quarters (for transfer students), and nine (9) quarters (for frosh students).
  P: Students should work with the applied instructor of their primary instrument to determine which of the courses listed would be appropriate.
    * MUSC 61
    * MUSC 62
    * MUSC 161
    * MUSC 161A
    * MUSC 162
```

**What the JSON has**: `"op": "all_of"` over the five lesson courses — which
would require every one of MUSC 61, 62, 161, 161A, and 162. The page instead
requires the appropriate lesson course each quarter for a minimum of
nine (frosh) / six (transfer) quarters.

**Smallest correct representation**: an `n_of` rule with `"n": 9` over the
five-course pool (repeat-counting is an in-scope approximation), with the
transfer minimum of six and the instructor-selection guidance as notes.

## Section: Comprehensive Requirement — required course marked info

**What the page says**:

```
[h4 sc-level-2] Comprehensive Requirement
  P: Students fulfill the comprehensive requirement for the Music B.M. degree by completing MUSC 196B : Senior Recital Preparation (w/ lessons). ...
    * MUSC 196B
```

**What the JSON has**: `"op": "info"` with courses `["MUSC196B"]`. `info`
denotes advisory prose that is never required, so the comprehensive
requirement is dropped from the machine-readable requirements.

**Smallest correct representation**: `"op": "all_of"` with
`"courses": ["MUSC196B"]`.

## Additional weak representation (minor)

Foreign Language Requirement (FREN 1 and ITAL 1 required for B.M. voice
students only) is an `info` rule; the conditional voice-student requirement is
carried only in prose. An `all_of` of FREN 1/ITAL 1 with an
applies-only-to-voice-students constraint (or category rule with
needs_review) would preserve it, though the schema has no conditional
operator.

## Checked and matching (not discrepancies)

Lower-division theory all_of (MUSC 30A/30B/30C); MUSC 31 + MUSC 60 all_of
with the MUSC 31 retake policy as notes/constraints; Core History/Culture
n_of 4 with the "at least two from 101A/B/C" rider as a constraint (in-scope);
Elective History/Culture one_of (14 courses, MUSC 105S/253S as primary code);
Core and Elective Theory n_of 2 with its core-course rider as a constraint;
Continuing B.M. Juries as info (non-course requirement); DC one_of over the
11 listed courses.
