# middle-eastern-and-north-african-studies-menas-minor — verification failures

## Section: At least three quarters of language instruction

### Arabic-or-Hebrew disjunction encoded as two independent required rules

Page says:

> P: At least three quarters of language instruction from a single language or complete the highest level of your chosen language ( ARBC 4 , HEBR 4 ), or demonstrate proficiency above the level of ARBC 4 or HEBR 4 through a placement exam.
> [h4] Three from the following:
>   P: Take three from the following OR complete the highest-level course, ARBC 4 .
>     * ARBC 1 ... ARBC 4
> [h4] Or three from the following:
>   P: Take three from the following OR complete the highest-level course, HEBR 4 .
>     * HEBR 1 ... HEBR 4

JSON has an `info` rule carrying the summary prose, followed by two sibling
sections each containing a required rule:

```json
{"op": "n_of", "n": 3, "courses": ["ARBC1","ARBC2","ARBC3","ARBC4"]}
{"op": "n_of", "n": 3, "courses": ["HEBR1","HEBR2","HEBR3","HEBR4"]}
```

Nothing machine-readable links them as alternatives — the "or" survives only
in the second section's title string — so as encoded the minor requires three
quarters of Arabic AND three quarters of Hebrew (six language courses), where
the page requires one language path.

Smallest correct representation: a single language-requirement rule with
`"op": "options"` and branches for the two language pools (or a
`section_choice` parent over the two n_of subrules), keeping the
highest-level-course (ARBC 4 / HEBR 4) and placement-exam alternatives as
constraints/notes.

(The lower-division one_of, the five-course upper-division n_of and its
membership, and the substitution-policy info rule all match the page.)
