# biology-minor — verification failures

## Section: Upper-Division Elective

### Required elective represented as non-required `info`

Page says:

> [h4] Upper-Division Elective
>   P: Students complete one upper-division elective of five credits or more chosen from BIOE 100-BIOE 181 or BIOL 100 -BIOL 181.

JSON has:

```json
"op": "info", "n": null, "courses": [], "needs_review": false
```

`info` denotes advisory/policy prose that is never required, but this is a
required course of the minor (one elective). The membership is well defined
by course-number ranges, so it is not a genuinely unenumerated category.

Smallest correct representation: a `range` rule with `"n": 1` and a filter
including the series BIOE 100-181 and BIOL 100-181, with the "five credits or
more" rider carried as a constraint/note. (A `category_count` with
`needs_review: true` and n=1 would also be an acceptable approximation, but
plain `info` drops the requirement entirely.)
