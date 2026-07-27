# ecology-and-evolution-bs — verification failures

## 1. Section: Electives / "Three general electives ..." / "Biological Sciences-EEB" — pool's BIOE range coded as info

**Page says** (rendered snapshot):

```
[h5 sc-level-3] Three general electives chosen from the following:
[h6 sc-level-4] Biological Sciences-EEB
  P: Any upper-division BIOE course numbered BIOE 100 - BIOE 179 of 5 or more credits that is not required to fulfill a different requirement group.
```

The BIOE 100-179 range is the primary membership source for the
three-general-electives pool.

**JSON has**: the counting parent is fine (`n_of`, `n: 3`,
`from_following_lists: true`), but the Biological Sciences-EEB rule is
`"op": "info"` with `"courses": []` — the range lives only in `source.prose`
and contributes nothing to the machine-readable pool. Every BIOE general
elective is therefore missing.

**Smallest correct representation**:

```json
{"op": "range",
 "filter": {"subject": "BIOE", "include": [[100, 179]], "min_credits": 5}}
```

with the "not required to fulfill a different requirement group" rider as a
note (accepted approximation), matching the `range` representation used
elsewhere in the corpus.

## 2. Section: Comprehensive Requirement — both course-list subrules have operator `unknown`

**Page says**:

```
[h4 sc-level-2] Comprehensive Requirement
  P: ... This requirement can be satisfied in one of the following ways:
  LI: receiving a passing grade in an independent research course, or field/laboratory course listed below.
  LI: completing a senior thesis.
[h5 sc-level-3] Comprehensive courses offered by Ecology and Evolutionary Biology
    * BIOE 112L ... BIOE 183W   (39 courses)
[h5 sc-level-3] Other Comprehensive Course Options
    * METX 100L
    * CRSN 152
```

i.e. pass one course drawn from either list (or complete a senior thesis).

**JSON has**: a `section_choice` parent, but both subrules are
`"op": "unknown"`, `"needs_review": true` (the 39-course EEB list and the
METX 100L / CRSN 152 list). With unknown operators the comprehensive
requirement is not machine-satisfiable.

**Smallest correct representation**: keep the `section_choice` parent and
give each subrule `"op": "one_of"` over its course list (the senior-thesis
alternative may stay as prose).

## 3. Section: Electives / "One of the following may also be used as an upper-division general elective" — "5 credits" coded as n_of 5 courses

**Page says**:

> [h6 sc-level-5] Biological Sciences-EEB
> P: Any 5 credits of undergraduate research from:
>     * BIOE 183W / BIOE 183L / BIOE 193 / BIOE 193F / BIOE 195
> P: or
> [h6 sc-level-5] Environmental Studies
>     * ENVS 183

**JSON has**: under the `section_choice` parent, the EEB branch is
`"op": "n_of"`, `"n": 5` over exactly those five courses — which means "take
all five courses". The page's 5 is a credit total (roughly one 5-credit
research enrollment), not a count of five distinct courses.

**Smallest correct representation**: `"op": "one_of"` over the five research
courses with the "any 5 credits of undergraduate research" rider carried as
a constraint/note (or a `category_count` with `needs_review` given the
variable-credit repeatability).
