# cognitive-science-bs — verification failures

## 1. Upper-Division Courses > Core Courses: "three of the four areas" represented as all four required

**Page says** (rendered source):

```
[h5 sc-level-3] Core Courses
  P: Students must complete a course from three of the four following areas:
[h6 sc-level-4] Perception
    * PSYC 121
[h6 sc-level-4] Neuroscience
    * PSYC 123
[h6 sc-level-4] Language
    * PSYC 125
[h6 sc-level-4] Memory
    * PSYC 129
```

**JSON has**: an `info` rule carrying the "three of the four" sentence, followed by four
separate `all_of` rules (one each for PSYC121, PSYC123, PSYC125, PSYC129) in the
Upper-Division Courses section — i.e. all four core courses are required and the n=3
count is lost.

**Smallest correct representation**: one `n_of_groups` rule with `n: 3` and branches
[["PSYC121"], ["PSYC123"], ["PSYC125"], ["PSYC129"]] (equivalently `n_of` n=3 over the
four courses), under heading "Core Courses".

## 2. Electives > "One Senior Seminar" recorded as `info` (required seminar dropped)

**Page says**:

```
[h6 sc-level-4] One Senior Seminar:
  P: Seminar courses are psychology courses identified within the General Catalog by their course descriptions containing the phrase “satisfies seminar requirement.” These are any courses from the PSYC 119, PSYC 139, PSYC 159, or PSYC 179 series. Only one seminar will count toward fulfilling these elective requirements.
```

This is one of the three required cognitive psychology electives (and the same seminar
also satisfies the DC and Comprehensive requirements, both of which are `info` rules that
lean on it).

**JSON has**: `"op": "info"` with no courses and no n — the seminar requirement is not
required anywhere in the machine representation.

**Smallest correct representation**: a `range` rule over the PSYC 119 / PSYC 139 /
PSYC 159 / PSYC 179 series with `n: 1` (or `category_count` n=1 with
`needs_review: true`, since series membership is unenumerated on the page), keeping the
"only one seminar will count" sentence in notes.

## 3. Transfer Admission Screening > "Recommended Prior to Transfer" recorded as required

**Page says**:

```
[h5 sc-level-3] Recommended Prior to Transfer
  P: Though not required, students are recommended to complete the following prior to transfer:
    * PSYC 20
```

**JSON has**: `"op": "all_of"` with courses ["PSYC20"] inside the "Transfer Admission
Screening Policy" qualification section — an explicitly not-required, recommended course
is represented as required screening coursework.

**Smallest correct representation**: `"op": "info"` (advisory/recommended content),
retaining the prose.
