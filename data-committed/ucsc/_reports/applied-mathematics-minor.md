# FAIL report: applied-mathematics-minor

## 1. Section "Basic calculus sequence:" — AND between the two choices lost

**Page says** (narrative markers):

```
>> NARRATIVE MARKER [either-these-courses]
 * MATH 19A
 * MATH 19B
>> NARRATIVE MARKER [or-these-courses]
 * MATH 20A
 * MATH 20B
>> NARRATIVE MARKER [and]
>> NARRATIVE MARKER [either-these-courses]
 * MATH 23A
 * MATH 23B
>> NARRATIVE MARKER [or-this-course]
 * AM 30
```

i.e. (MATH 19A + MATH 19B **or** MATH 20A + MATH 20B) **and** (MATH 23A +
MATH 23B **or** AM 30) — two independent choices, both required.

**JSON has**: a single `options` rule with four branches
`[[MATH19A, MATH19B], [MATH20A, MATH20B], [MATH23A, MATH23B], [AM30]]`,
which is satisfiable by any one branch (e.g. AM 30 alone).

**Smallest correct representation**: two `options` rules in the section:

```json
{"op": "options", "branches": [["MATH19A","MATH19B"], ["MATH20A","MATH20B"]]}
{"op": "options", "branches": [["MATH23A","MATH23B"], ["AM30"]]}
```

## 2. Section "Complete one course from each of the following categories" / "Introduction to Numerical Methods" — operator unknown

**Page says**:

```
[h4 sc-level-2] Complete one course from each of the following categories
[h5 sc-level-3] Introduction to Numerical Methods
    * AM 147
    * PHYS 115
    * MATH 148
```

One course from this category is required.

**JSON has**: `"op": "unknown"`, `"needs_review": true`, `"n": null` over
`[AM147, PHYS115, MATH148]`.

**Smallest correct representation**:

```json
{"op": "one_of", "courses": ["AM147", "PHYS115", "MATH148"]}
```

## 3. Same section / "Partial Differential Equations" — operator unknown

**Page says**:

```
[h5 sc-level-3] Partial Differential Equations
    * AM 112
    * PHYS 116C
    * MATH 107
```

One course from this category is required.

**JSON has**: `"op": "unknown"`, `"needs_review": true` over
`[AM112, PHYS116C, MATH107]`.

**Smallest correct representation**:

```json
{"op": "one_of", "courses": ["AM112", "PHYS116C", "MATH107"]}
```

## 4. (Minor) "Plus One Applied Mathematics Elective from the Following List" — unlisted AM range only in source prose

**Page says**: "Any 5-credit upper-division (100-199) or graduate (200-299)
AM course that is not already listed in the categories above. Independent
studies ( AM 198 ), AM 200 , 211, and the 280 series and above may not be
used." plus the explicit list CSE 107 ... STAT 132.

**JSON has**: `one_of` over the 13 explicitly listed courses only; the AM
range eligibility survives only in `source.prose`, not as a rule/constraint.

**Smallest correct representation**: an `options`/`one_of` combining the
listed courses with a `range` branch over AM 100-199 / 200-279 excluding
AM 198, AM 200, AM 211 (or at minimum carry the prose as a
`constraints`/`notes` entry on the rule).
