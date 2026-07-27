# black-studies-minor — verification failures

## Section: Upper-Division Courses / General Electives

### Elective count (n=5) lost; counting parent coded as `info`

Page says:

> P: Five upper-division courses from the General Electives list below. At least two of these electives must be CRES courses (i.e., under the CRES designation). Courses in the General Electives list that are cross-listed with a CRES course may also count toward the two required CRES courses.

JSON has the parent rule as:

```json
"op": "info", "n": null, "courses": []
```

with the five-course requirement carried only as prose in `constraints`, and the
General Electives pool as:

```json
"op": "list", "n": null
```

`info` means advisory prose that is never required, and no rule records the
stated count of five, so the requirement is not machine-enforced anywhere.
(Course membership of the electives list itself matches the page exactly, with
cross-listing riders carried as primary codes — that part is fine.)

Smallest correct representation: code the Upper-Division Courses parent rule as
`"op": "n_of"`, `"n": 5`, `"from_following_lists": true` (the pattern used in
e.g. electronic-music-minor.json), keeping the "at least two must be CRES"
rider as a prose constraint, with the General Electives `list` rule as the pool.
