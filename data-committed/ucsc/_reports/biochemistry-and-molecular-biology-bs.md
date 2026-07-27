# biochemistry-and-molecular-biology-bs — verification failures

## Section: Transfer Admission Screening Policy

**What the page says** (rendered snapshot):

```
[h5 sc-level-3] And these courses:
    * BIOL 20A
    * CHEM 8A
    * CHEM 8B
```

These three courses are listed under "And these courses:" — an
all-of requirement. (The identical set is correctly rendered as `all_of`
in the "Major Qualification" section under the heading "Plus these
courses", confirming the intended operator.)

**What the JSON has**: the rule for this heading has `"op": "unknown"`
with `"needs_review": true` (courses `["BIOL20A","CHEM8A","CHEM8B"]`
listed). `unknown` is not a valid operator and the membership is fully
enumerated, so the `needs_review` approximation (reserved for genuinely
unenumerated `category_count` categories) does not apply.

**Smallest correct representation**: `"op": "all_of"`, `"needs_review":
false`, courses `["BIOL20A","CHEM8A","CHEM8B"]`.
