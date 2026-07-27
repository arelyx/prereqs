# literature-minor — verification failures

## Section: "Plus one of the following options:" — required lower-division elective dropped to info

**What the page says**:

```
[h4 sc-level-2] Plus one of the following options:
  LI: One course from the LIT 60 or LIT 61-series, or
  LI: One course from the LIT 80 or LIT 81-series
```

This is a required course: the student takes one course from either the
LIT 60 / LIT 61-series or the LIT 80 / LIT 81-series. It is the second of the
minor's seven required courses (LIT 1 + this elective + LIT 101 + four
upper-division electives = 7, matching "The minor in literature requires
seven courses").

**What the JSON has**: `"op": "info"`, `"n": null`, `courses: []`, with the
options carried only as `source.prose`/`notes`. `info` denotes advisory prose
that is never required, so this required course is dropped — the JSON then
encodes only six required courses (LIT 1, LIT 101, and four range electives),
one short of the stated seven.

**Smallest correct representation**: a required choose-one rule, e.g.
`"op": "options"` with two branches (one from the LIT 60/61-series, one from
the LIT 80/81-series), or a `range`/`category_count` (n=1, `needs_review:
true`) over the LIT 60/61/80/81 series, since the membership is series-based.
