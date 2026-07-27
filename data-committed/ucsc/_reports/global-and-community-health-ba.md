# global-and-community-health-ba — verification failures

## Section: Disciplinary Communication (DC) Requirement — Option 1 wrong operator

**What the page says**:

```
[h5 sc-level-3] Option 1
  P: Both of the following courses:
    * GCH 190
    * GCH 195
```

"Both of the following courses" means both GCH 190 and GCH 195 are
required (all-of / n_of n=2). (Option 2 has the identical phrasing "Both of
the following courses" and is correctly modeled as `n_of` n=2; Option 3
"All three of the following courses" as `n_of` n=3.)

**What the JSON has**: Option 1 rule has `"op": "one_of"`, `"n": null`,
courses `["GCH190","GCH195"]`. `one_of` means choose exactly one of the two,
which contradicts "Both of the following courses."

**Smallest correct representation**: `"op": "n_of"`, `"n": 2` (or `all_of`)
over `["GCH190","GCH195"]`, matching the sibling Option 2/3 representation.

## Section: Upper-Division Courses — Common Core count understated

**What the page says**:

```
[h5 sc-level-3] Upper-division Global and Community Health requirements
  P: All students are required to complete and pass two common core courses:
     the first, a course in Community Analysis ...; the second, a course in
     Social Analysis ...

[h6 sc-level-4] Requirement 1: Community Analysis ...
  P: Choose one course:
    (ANTH 134, CMMU 165, GCH 166, METX 108)

[h6 sc-level-4] Requirement 2: Social Analysis ...
  P: Choose one course:
    (GCH 123, GCH 186, SOCY 146)
```

Two common core courses are required: one from Requirement 1's list AND one
from Requirement 2's list.

**What the JSON has**: the umbrella "Upper-division Global and Community
Health requirements" rule is `"op": "n_of"`, `"n": 1`,
`"from_following_lists": true`, drawing from the two `list`-typed children
(Requirement 1 and Requirement 2). n=1 represents only one course total,
understating the "two common core courses" requirement. (For contrast, the
parallel "Six upper-division electives" rule correctly models each context
Area as `one_of` and totals them with `n_of` n=6.)

**Smallest correct representation**: model Requirement 1 as `one_of` over its
four courses and Requirement 2 as `one_of` over its three courses (both
required); or set the counting parent to `n=2` over the two lists. The stated
count is two, not one.
