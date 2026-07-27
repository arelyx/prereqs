# earth-sciencesanthropology-combined-major-ba — verification failures

## Section: Disciplinary Communication (DC) Requirement

### EART DC option courses entirely missing (empty branch)

Page says:

> [h5] One of the following options:
>     >> NARRATIVE MARKER [either-these-courses]: ''
>     * EART 189A
>     * EART 189B
>     >> NARRATIVE MARKER [or-one-of-these-courses]: ''
>     * EART 191
>     * EART 191C
>     * EART 191D
>     * EART 195
> [h5] Or one course from this list:
>     * ANTH 194C ... ANTH 196W

JSON has a single `options` rule with branches:

```json
"branches": [[], ["ANTH194C", "ANTH194H", "ANTH194L", "ANTH194U", "ANTH194V", "ANTH194Y", "ANTH196L", "ANTH196T", "ANTH196U", "ANTH196W"]]
```

The first branch is empty — EART 189A, EART 189B, EART 191, EART 191C,
EART 191D, and EART 195 do not appear anywhere in the DC section. Membership
failure.

Smallest correct representation: a `section_choice` (or `options`) between
(a) an options rule with branches [EART 189A + EART 189B] or [one of EART 191,
EART 191C, EART 191D, EART 195], and (b) a one_of over the ten ANTH seminar
courses, keeping the double-count note as a constraint.

## Section: Lower-Division Courses

### 1. "Plus five lower-division science courses" — count lost, wrong operator, branches don't match markers

Page says:

> P: Students choose five courses from the following list. ...
>     * BIOL 20A ... * PHYS 6M
>     >> NARRATIVE MARKER [and]: ''
>     * CHEM 3A
>     * CHEM 3B
>     * CHEM 3C
>     >> NARRATIVE MARKER [or]: ''
>     * CHEM 4A ... * CHEM 4BL

JSON has `"op": "options"`, `"n": null`, courses
[BIOL20A, BIOE20B, BIOE20C, PHYS6A, PHYS6L, PHYS6B, PHYS6M, CHEM3A, CHEM3B]
and branches [["CHEM3C"], ["CHEM4A","CHEM4AL","CHEM4B","CHEM4BL"]].

Problems: (a) the stated count of five is not recorded; (b) `options`
(choose one branch) is the wrong operator for a choose-5-from-pool rule;
(c) the marker partitioning puts CHEM 3A/3B/3C together as the CHEM 3 series
alternative, but the JSON splits CHEM 3A/3B into the flat pool and leaves
CHEM 3C alone in a branch.

Smallest correct representation: `n_of` with `n: 5` over the full pool, with
the "CHEM 3 series or CHEM 4 series, not both" rider as a constraint (as the
page itself phrases it).

### 2. MATH options branches don't match narrative markers

Page says:

> [h5] Plus one of the following options:
>     * MATH 11A
>     * MATH 11B
>     >> NARRATIVE MARKER [or]: ''
>     * MATH 19A
>     * MATH 19B

JSON has `"courses": ["MATH11A"]` with branches
[["MATH11B"], ["MATH19A","MATH19B"]]. MATH 11A is stranded outside the
branches and MATH 11B is a standalone branch; the marker partitioning is
[MATH 11A + MATH 11B] or [MATH 19A + MATH 19B].

Smallest correct representation: `options` with branches
[["MATH11A","MATH11B"], ["MATH19A","MATH19B"]] and empty `courses` (the
Transfer Admission Screening section of this same file encodes the identical
requirement correctly).

## Section: Electives

### Anthropology Electives (4 required) coded as non-required `info`

Page says:

> [h5] Anthropology Electives
>   P: Four 5-credit or more upper-division archeology, biological/medical/environmental anthropology, or laboratory methods courses. ...

JSON has `"op": "info"`, `"n": null`. This is a required count-4 rule with a
genuinely unenumerated category; `info` is never required, so the requirement
is dropped.

Smallest correct representation: `category_count` with `"n": 4` and
`"needs_review": true`, carrying the page prose as the category description.

## Section: Transfer Admission Screening Policy (secondary)

The EART intro-geology rule has the same stranded-course malformation:
`"courses": ["EART5"]` with branches [["EART5L"], ["EART10","EART10L"],
["EART20","EART20L"]]; the marker partitioning is [EART 5 + EART 5L] as the
first branch. The screening "Five lower-division science courses" rule also
repeats discrepancy 1 above (n=5 lost, CHEM partition mangled).

## Section: Comprehensive Requirement (secondary)

The five comprehensive options (which include concrete courses: ANTH 194/196
seminars, EART 189A+EART 189B, EART 191 or EART 191D, EART 195, EART 198) are
carried only as `info` prose; no option structure is represented. An `options`
rule with the enumerable branches (and needs_review for the seminar list)
would be the smallest faithful representation.
