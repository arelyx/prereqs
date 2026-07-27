# chemistry-ba — verification failures

## Electives (section "Electives", kind `electives`)

**Page says** (rendered snapshot 20260727T041640Z):

```
[h4 sc-level-2] Electives
  P: At least two from the following:
    * BIOC 100A
    * CHEM 103
    * CHEM 122
    * CHEM 124
    * CHEM 143
    * CHEM 144
    * CHEM 151B
    * CHEM 156C
    * CHEM 163C
    * CHEM 169
    * CHEM 171
    * METX 101
    * OCEA 120
    * OCEA 121
    * PHYS 156
    * PHYS 180
```

**JSON has**: the single Electives rule with `"op": "list"`, `"n": null`, and the
count only as a prose constraint (`{"text": "At least two from the following:",
"type": "prose"}`). `list` is defined as a pool drawn from by a counting
parent, but there is no counting parent here, so the stated count of two is
not represented in the operator/count fields.

**Smallest correct representation**: same 16-course pool with
`"op": "n_of"`, `"n": 2` (constraints/notes unchanged).

No other discrepancies found: qualification/screening options branches,
lower-division General Chemistry/Calculus/Multivariable/Physics/Organic rules,
upper-division all_of and advanced-lab one_of, and the DC and Comprehensive
sections (CHEM 151L plus one advanced lab) all match the page.
