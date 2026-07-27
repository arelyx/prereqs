# italian-studies-minor — verification failures

## Section: Lower-Division Courses

### Full six-course language sequence coded as "2 of" the list

Page says:

> P: Complete the lower-division Italian language sequence (ITAL 1–ITAL 6), or equivalent.
>     * ITAL 1
>     * ITAL 2
>     * ITAL 3
>     * ITAL 4
>     * ITAL 5
>     * ITAL 6

JSON has:

```json
"op": "n_of", "n": 2,
"courses": ["ITAL1","ITAL2","ITAL3","ITAL4","ITAL5","ITAL6"]
```

The page requires completing the whole sequence (all six courses, or
equivalent), not two of them. As encoded, a student with any two ITAL courses
would satisfy the rule.

Smallest correct representation: `"op": "all_of"` over the six courses,
keeping the ITAL 1A/1B accelerated-track equivalence as the existing note.

## Section: Italian Literature (secondary)

### LIT 185-series eligibility missing from membership

Page says:

> P: Take two courses from the LIT 185 series or the following list. ...

JSON has `n_of` n=2 over only the 11 explicitly listed courses; the LIT 185
series alternative survives only in `source.prose`. Since the 185-series
courses are enumerable (they are listed under "Courses Taught Substantially in
Italian"), the rule's membership should also admit the LIT 185 series (e.g.
via an include_series filter or by adding the series courses to the pool).
