# history-of-art-and-visual-culture-ba — verification failures

## Section: Lower-Division Courses (General Major and CHM concentration)

### Required four-course rule coded as non-required `info`

Page says:

> [h4] Lower-Division Courses
>   P: Take four lower-division courses, each from a different geographic region listed below:
>   LI: HAVC courses 10-19: Africa and its Diaspora
>   LI: HAVC courses 20-29: Asia and its Diaspora
>   LI: HAVC courses 30-49: Europe and the Americas
>   LI: HAVC courses 50-59: Mediterranean
>   LI: HAVC courses 60-69: Native Americas
>   LI: HAVC courses 70-79: Oceania and its Diaspora

JSON (both in the General Major section and in the CHM concentration
section) has a single rule with `"op": "info"`, `"n": null`. `info` is never
required, so the four-course requirement — and its stated count — is dropped.

Smallest correct representation: a `range` rule with `"n": 4` and
include_ranges for the six HAVC lower-division region bands (or
`category_count` with n=4 and needs_review), carrying the
different-region-each and HAVC 80 riders as constraints/notes.

## Section: Upper-Division Courses (General Major and CHM concentration)

### "Plus one senior exit seminar" coded as non-required `info`

Page says:

> [h5] Plus one senior exit seminar:
>   P: HAVC seminar courses are numbered 190-191. The senior exit seminar can be taken any quarter in which a student is in senior standing. ...

JSON has `"op": "info"`, `"n": null` in both the General Major and
concentration Upper-Division sections. This is one of the nine required
upper-division courses (the page's total is 13 courses); as `info` the
requirement is dropped.

Smallest correct representation: `range` with `"n": 1` and an include series
for HAVC 190-191 (or `category_count` n=1), with the
permission-of-instructor rider as a note.

## Section: Approved Concentration Courses List (CHM concentration)

### Rule left as op "unknown"; required count of four not recorded

Page says (Course Requirements prose of the concentration):

> P: In fulfilling the major requirements, students in the concentration must successfully complete four courses from the “Approved Concentration Courses” list below. No more than one of the four courses can be lower-division and at least two of the four courses must be HAVC-sponsored courses. ...

and lists 18 courses (HAVC 40 ... VAST 188J/HAVC 188J).

JSON has:

```json
"op": "unknown", "needs_review": true, "n": null, "courses": [<18 courses>]
```

The operator is unresolved and the count of four appears only inside prose.

Smallest correct representation: `n_of` with `"n": 4` over the 18 listed
courses, with the "no more than one lower-division" / "at least two
HAVC-sponsored" riders as constraints and the HAVC 199/HIS 199 petition
note retained.
