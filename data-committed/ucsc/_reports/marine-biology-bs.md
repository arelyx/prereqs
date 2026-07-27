# marine-biology-bs — verification failures

Ground truth: `render_page marine-biology-bs` (snapshot 20260727T041640Z).
Candidate: `data-committed/ucsc/programs/marine-biology-bs.json`.

## 1. Undergraduate-research general elective — 5 credits misread as n = 5 courses

Page (Electives > "One of the following may also be used as an upper-division
general elective:" > Biological Sciences-EEB):

> P: Any 5 credits of undergraduate research
>     * BIOE 183W
>     * BIOE 183L
>     * BIOE 193
>     * BIOE 193F
>     * BIOE 195
> P: or
> [h6] Environmental Studies
>     * ENVS 183

JSON: the Biological Sciences-EEB branch has `"op": "n_of", "n": 5` over the
five research courses — i.e. take all five courses — where the page requires
**5 credits** (one course's worth) of undergraduate research. The "5" is a
credit total, not a course count.

Smallest correct representation: under the existing `section_choice` parent, a
branch rule of `op: list` (or one_of) over `[BIOE183W, BIOE183L, BIOE193,
BIOE193F, BIOE195]` with the "any 5 credits of undergraduate research"
condition carried as a constraint/note, alongside the ENVS 183 branch.

## 2. Comprehensive Requirement — course pools left as `op: "unknown"`

Page:

> P: ... This requirement can be satisfied in one of the following ways:
> LI: receiving a passing grade in an independent research course, or
> field/laboratory course listed below.
> LI: completing a senior thesis.
> [h5] Comprehensive courses offered by Ecology and Evolutionary Biology (39 courses)
> [h5] Comprehensive courses offered in other departments: METX 100L, CRSN 152

JSON: a `section_choice` parent followed by two rules with `"op": "unknown"`,
`"needs_review": true` (the 39-course EEB list and [METX100L, CRSN152]).
`unknown` is not a valid operator, so the choose-one-course pools are not
usable branches of the section_choice. The senior-thesis alternative is also
not represented (the parent prose stops before the LI items).

Smallest correct representation: the two pools as `op: list` (memberships as
committed, which match the page) under the `section_choice`, plus the senior
thesis alternative carried at least as a note/constraint on the parent.

## 3. (Minor) General electives — "Any upper-division BIOE 100–179" pool as `info`

Page (Three general electives > Biological Sciences-EEB):

> P: Any upper-division BIOE course numbered BIOE 100 - BIOE 179 of 5 or more
> credits that is not required to fulfill a different requirement group.

JSON: `"op": "info"` with the prose. The largest component of the general
elective pool under the `n_of 3, from_following_lists` parent is therefore
prose-only. Smallest correct representation: an `op: range` rule with
`include_ranges: [{subject: BIOE, lo: 100, hi: 179}]` and the 5-credit /
no-double-count riders as constraints.

## Sections verified with no discrepancy

Screening and Major Qualification (segregated), all lower-division rules
(intro bio, CHEM 3/4 options, MATH series options, STAT 7/7L, PHYS 6 options),
core/ecology/marine-environment/marine course rules, the 31-course topical
elective n_of-3, the enumerated general-elective lists, and the 29-course DC
n_of-2 with its lab riders as notes.
