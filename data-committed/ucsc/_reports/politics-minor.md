# politics-minor — verification failures

## Section: Lower-Division Elective

### Required lower-division range pick coded as `info`

Page says:

> P: One 5-credit lower-division politics course from POLI 1 - POLI 70 .

JSON has:

```json
"op": "info", "n": null, "courses": []
```

This is one of the six required minor courses, with a fully stated range, but
`info` means advisory prose that is never required. (The same file correctly
encodes the upper-division elective as a `range` rule, so the representation
exists.)

Smallest correct representation: `"op": "range"`, `"n": 1`, filter include
range POLI 1-70.

## Section: Four core courses

### "Two courses each from two different subfields" not machine-encoded; subfield rules left `unknown`

Page says:

> P: Take two courses each from two different subfields below.
> [h5] Theory — POLI 105A-D
> [h5] U.S. Politics — POLI 120A-C
> [h5] Comparative — POLI 140A/C/D/E
> [h5] Global Politics/International Relations — POLI 160A-D

JSON has an `info` parent carrying the prose, followed by four subfield rules
all coded:

```json
"op": "unknown", "needs_review": true, "n": null
```

The four-course count and the 2-from-each-of-2-subfields structure are not
recorded in any machine field, and `unknown` is not a valid operator for a
fully enumerated requirement.

Smallest correct representation: an `n_of_groups` rule with `n: 2` groups at
2 courses each (or equivalent parent with the four subfield course lists as
group branches: Theory, U.S. Politics, Comparative, Global/IR), cross-listing
riders as primary codes as already done.
