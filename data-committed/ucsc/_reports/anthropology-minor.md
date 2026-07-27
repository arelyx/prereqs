# anthropology-minor — verification failures

## Section: Upper-Division Courses

**What the page says** (rendered snapshot):

```
[h3 sc-level-1] Upper-Division Courses
  LI: one course in regional specialization
  LI: one course in sociocultural anthropology
  LI: one course in archaeology
  LI: one course in biological, medical, or environmental anthropology
  LI: three additional anthropology courses from the Courses in Anthropology by Category List
```

Intro paragraph confirms these are required: "The minor in anthropology has a
total of 10 courses required: three lower-division and seven upper-division
courses."

**What the JSON has**: a single rule with `"op": "info"`, `"n": null`,
`"courses": []`, with the five category lines carried only as `source.prose`.
`info` denotes advisory/policy prose that is never required, so the entire
seven-course upper-division requirement is dropped from the machine-readable
requirements.

**Smallest correct representation**: five `category_count` rules in the
Upper-Division Courses section, each `needs_review: true` (membership is
genuinely unenumerated, defined by the department's "Courses in Anthropology
by Category" list):

- `category_count`, n=1 — regional specialization
- `category_count`, n=1 — sociocultural anthropology
- `category_count`, n=1 — archaeology
- `category_count`, n=1 — biological, medical, or environmental anthropology
- `category_count`, n=3 — additional anthropology courses from the Courses in
  Anthropology by Category List
