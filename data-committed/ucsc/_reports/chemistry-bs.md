# chemistry-bs — verification failures

## Section: Transfer Admission Screening Policy (BIOC-concentration pre-transfer subrule)

**What the page says** (h6 nested under the h5 "Recommended pre-transfer
courses" within the Transfer Admission Screening Policy):

```
[h6 sc-level-4] If transferring into CHEM BS with BIOC concentration add these as pre-transfer courses:
    * BIOL 20A
    * BIOE 20B
```

**What the JSON has**: a rule with `"op": "unknown"`, `"needs_review": true`,
`"courses": ["BIOL20A", "BIOE20B"]`, `"n": null`.

`unknown` is not a valid operator in the schema vocabulary (all_of / one_of /
n_of / options / n_of_groups / range / section_choice / list / category_count
/ info), so the rule's semantics are undefined — it is neither marked
advisory nor given a requirement operator.

**Smallest correct representation**: the heading sits inside the
"Recommended pre-transfer courses" (advisory) subsection, so an `info` rule
carrying BIOL 20A and BIOE 20B (advisory content is never required), with the
conditional "if transferring into CHEM B.S. with BIOC concentration" kept in
prose/notes. (If instead read as required pre-transfer coursework for
BIOC-concentration transfer applicants, an `all_of` of the two courses —
either way, not `unknown`.)

## Everything else checked and matching (not discrepancies)

All other sections match the rendered page: transfer screening
(CHEM 3ABC-or-4AB + MATH 22; MATH 11AB-or-19AB), Major Qualification
(both options rules plus MATH 22 / MATH 23A / AM 30), General Major
lower-division (General Chemistry, Calculus, Multivariable Calculus,
Advanced Mathematics one_of, Physics, Organic Chemistry), upper-division
(CHEM 110/110L, 151A/151L, CHEM 103, Physical Chemistry incl. CHEM 164),
Electives membership (14 courses; "At least two" carried as a constraints
prose rider — in-scope approximation), DC and Comprehensive
(CHEM 151L + one_of seven labs), and the full Biochemistry concentration
(incl. BIOC 100ABC + one-of-four lab options, Physical Chemistry without
CHEM 164, DC/Comprehensive CHEM 151L + one-of-eight).
