# computer-science-computer-game-design-bs — verification failures

## Section: Comprehensive Requirement

### Track subrules left as `op: "unknown"` instead of `all_of`

Page says:

> P: Students satisfy the senior comprehensive requirement by receiving a passing grade for all of the courses in one of the following tracks:
> [h5] Game Design
>     * CMPM 170
>     * CMPM 171
> [h5] Computational Media
>     * CMPM 173
>     * CMPM 174
> [h5] Games for Impact
>     * CMPM 181
>     * CMPM 182

JSON has a correct `section_choice` parent, but all three track subrules are:

```json
"op": "unknown", "needs_review": true, "n": null
```

The page states the semantics explicitly ("all of the courses in one of the
following tracks"), and each track's membership is fully enumerated, so
`unknown` is not a genuinely-unresolvable case. A consumer cannot tell whether
a track requires all or one of its two courses. Other committed files encode
the same pattern with `all_of` subrules (e.g. environmental-sciences-bs.json,
legal-studies-ba.json).

Smallest correct representation: `"op": "all_of"`, `"needs_review": false` on
each of the three track subrules (membership is already correct).

## Section: Transfer Admission Screening Policy

### "All but one of the following" rule: options branches do not match the narrative-marker partitioning

Page says:

> [h5] In addition, completing all but one of the following courses prior to transfer is recommended to ensure timely graduation:
>     * CSE 20
>     * CSE 12
>     >> NARRATIVE MARKER [one-of-these-courses]: ''
>     * AM 10
>     * MATH 21
>     >> NARRATIVE MARKER [one-of-these-courses]: ''
>     * ECE 13
>     * CSE 13S

JSON has:

```json
"op": "options",
"courses": ["CSE20", "CSE12"],
"branches": [["AM10"], ["MATH21"], ["ECE13"], ["CSE13S"]]
```

The markers partition the list into base courses {CSE 20, CSE 12} plus two
one-of pairs {AM 10, MATH 21} and {ECE 13, CSE 13S}; four singleton branches
(pick one of the four) is a different structure. The "all but one" rider is
also not captured.

Smallest correct representation: since this is a "recommended" advisory item,
an `info` rule carrying the prose would be in-scope; if kept structural, the
branches should be `[["AM10","MATH21"], ["ECE13","CSE13S"]]` (one from each
group) alongside base courses CSE 20 and CSE 12, with the "all but one" rider
as a constraint note.
