# earth-sciences-bs — verification failures

## Sections: Electives (General, Geology, Planetary Sciences, Ocean Sciences)

**What the page says** (identical wording in all four, only the count differs):

```
[h4 sc-level-2] Electives
  P: Students take four upper-division Earth sciences or ocean sciences courses of 5 or more credits, chosen from EART 100-199 (excluding EART 196B and EART 198 ) or OCEA 100 -199. ...
```

(General: four; Geology: two; Planetary: three; Ocean Sciences: four.)

**What the JSON has**: `range` rules whose filter is

```
{"include_ranges": [{"subject": "EART", "lo": 100, "hi": 199}],
 "exclude_ranges": [{"subject": "OCEA", "lo": 100, "hi": 199}],
 "exclude_codes": ["EART196B", "EART198"], ...}
```

OCEA 100-199 is placed in **exclude_ranges**, but the page *includes* it
("chosen from EART 100-199 ... **or** OCEA 100-199"). The n values (4/2/3/4)
are correct, but the filter contradicts the prose — and for the Ocean
Sciences concentration this wrongly bars all ocean-sciences electives.

**Smallest correct representation**: move OCEA 100-199 into
`include_ranges`; keep exclude_codes EART 196B/EART 198 and the prose riders
(EART 199/OCEA 199 one-quarter cap, ENVS 115A+115L pair, lecture/lab
combos) as constraints.

## Section: Electives (Geophysics Concentration)

**What the page says**:

```
  P: Students take four upper-division Earth sciences or ocean sciences courses of 5 or more credits, chosen from EART 100-199 (excluding EART 196B and EART 198 ) or OCEA 100 -199. ...
  P: Choosing from the following list is recommended, but not mandatory:
    * EART 104 ... EART 278A   (28 courses)
```

**What the JSON has**: `n_of` with n=4 over only the 28 listed courses. The
page says the list is "recommended, but not mandatory" — the real pool is
EART 100-199 (excl. 196B/198) or OCEA 100-199, same as the other
concentrations. As encoded, valid elective choices outside the recommended
list are rejected.

**Smallest correct representation**: same `range` rule as the other
concentrations (n=4, include EART 100-199 and OCEA 100-199, exclude EART
196B/EART 198), with the recommended list carried as a note.

## Section: Disciplinary Communication (DC) Requirement — Geology Concentration

**What the page says**:

```
  P: Students in the Earth Sciences B.S. major with a geology concentration satisfy the DC requirement by completing the following courses:
    * EART 189A
    * EART 189B
```

**What the JSON has**: `"op": "unknown"`, `needs_review: true`, courses
[EART189A, EART189B]. `unknown` is not a valid operator; both courses are
required.

**Smallest correct representation**: `"op": "all_of"` with EART 189A and
EART 189B.

## Sections: Comprehensive Requirement (General, Geology, Planetary, Ocean)

**What the page says** (General; Planetary/Ocean identical in form):

```
  P: To satisfy the comprehensive requirement, each student in these majors must complete one of the following options:
[h5] Satisfactory completion of Summer Field
    * EART 189A
    * EART 189B
[h5] Satisfactory completion of a senior thesis  (... enroll in and pass EART 195 ...)
[h5] Satisfactory completion of one of the following capstone course offerings:
    * EART 191 / EART 191C / EART 191D
[h5] Other Options  (by permission)
```

Geology: "each student in the geology concentration must complete:
Satisfactory completion of Summer Field (EART 189A, EART 189B)" — the only
option.

**What the JSON has**: the "Satisfactory completion of Summer Field" rule is
`"op": "unknown"` with `needs_review: true` in all four sections (General,
Geology, Planetary, Ocean). The parent is a plain `info` rule, so the
choose-one-of-the-subrules semantics is also not encoded (the method's
`section_choice` operator exists for exactly this shape).

**Smallest correct representation**: Summer Field as `"op": "all_of"` with
EART 189A + EART 189B; parent rule as `section_choice` for
General/Planetary/Ocean (Geology needs no choice — Summer Field is simply
required).

## Section: Transfer Admission Screening Policy — Recommended Courses

**What the page says**:

```
[h5 sc-level-3] Recommended Courses
  P: In addition, the following courses are recommended prior to transfer to ensure timely graduation:
    * CHEM 3A / CHEM 3B / CHEM 3C
    >> [and] >> [one-of-these-courses]: MATH 11B | MATH 19B
    >> [and] >> [either-these-courses]: PHYS 5A, 5L, 5B, 5M  [or-these-courses]: PHYS 6A, 6L, 6B, 6M
```

**What the JSON has**: a required `"op": "options"` rule with courses
[CHEM3A, CHEM3B, CHEM3C] and branches
`[[MATH11B],[MATH19B],[PHYS5A,PHYS5L,PHYS5B,PHYS5M],[PHYS6A,PHYS6L,PHYS6B,PHYS6M]]`.
(1) This is explicitly *recommended* (advisory) content and should be `info`,
not a required rule; (2) the branch partitioning does not match the
narrative markers — as encoded only one of {MATH 11B, MATH 19B, PHYS 5
series, PHYS 6 series} would be chosen, whereas the page requires one math
AND one physics series.

**Smallest correct representation**: an `info` rule carrying the recommended
courses in prose.
