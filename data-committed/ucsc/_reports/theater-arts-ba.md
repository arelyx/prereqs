# theater-arts-ba — verification failures

## Section: Upper-Division Courses

### Exclusion list coded as a required `all_of` rule

Page says:

> [h5] The following courses DO NOT satisfy theater arts major requirements:
>     * THEA 55B
>     * THEA 190
>     * THEA 198
>     * THEA 199

JSON has:

```json
"op": "all_of",
"courses": ["THEA55B", "THEA190", "THEA198", "THEA199"]
```

As encoded these four courses are REQUIRED, when the page says the opposite —
they cannot be used toward the major at all.

Smallest correct representation: an `info` rule carrying the exclusion prose
(or an exclusion note on the section) — never a course-bearing required rule.

## Section: Major Qualification and Declaration

### Practice-based dance category pool coded as a required "3 of" rule

Page says:

> [h6] Plus two additional courses chosen from two of the following three categories:
> [h6] Theater design and technology — THEA 10
> [h6] Acting — THEA 20, THEA 21
> [h6] Practice-based dance — THEA 30, 31A, 31B, 31C, 31L, 31M, 36, 37, 80Z

JSON has the parent `n_of` (n=2, from_following_lists) and codes the first two
categories as `list` pools, but the third is:

```json
"op": "n_of", "n": 3,
"courses": ["THEA30","THEA31A","THEA31B","THEA31C","THEA31L","THEA31M","THEA36","THEA37","THEA80Z"]
```

As encoded, qualification additionally requires three practice-based dance
courses; the page requires no such thing (the "three" on the page refers to
the three total qualification courses). The "from two different categories"
rider is also uncaptured, but the spurious n=3 rule is the hard error.

Smallest correct representation: `"op": "list"`, `"n": null` for the
Practice-based dance pool, matching its two sibling categories, with the
two-different-categories rider as a constraint on the parent n_of.
