# chemistry-minor — verification failures

## Section: Chemistry (Lower-Division) — "and these courses:"

**What the page says**:

```
[h5 sc-level-3] and these courses:
    * CHEM 8A
    * CHEM 8B
    * CHEM 8L
    * CHEM 8M
```

All four are required (all-of).

**What the JSON has**: `"op": "unknown"`, `"needs_review": true` with the
four courses listed. `unknown` is not a valid operator and the membership
is fully enumerated, so no approximation exemption applies.

**Smallest correct representation**: `"op": "all_of"`, `"needs_review":
false`, courses `["CHEM8A","CHEM8B","CHEM8L","CHEM8M"]`.

## Section: Physics — branch partitioning wrong

**What the page says**:

```
[h4 sc-level-2] Physics
    * PHYS 5A
    * PHYS 5B
    * PHYS 5C
    * PHYS 5L
    * PHYS 5M
    * PHYS 5N
    >> NARRATIVE MARKER [or]: ''
    * PHYS 6A
    * PHYS 6B
    * PHYS 6C
    * PHYS 6L
    * PHYS 6M
    * PHYS 6N
```

The `[or]` marker splits the list into two series: the full PHYS 5 series
(5A, 5B, 5C, 5L, 5M, 5N) OR the full PHYS 6 series (6A, 6B, 6C, 6L, 6M, 6N).

**What the JSON has**: `"op": "options"` with `courses:
["PHYS5A","PHYS5B","PHYS5C","PHYS5L","PHYS5M"]` (required) and
`branches: [["PHYS5N"], ["PHYS6A","PHYS6B","PHYS6C","PHYS6L","PHYS6M","PHYS6N"]]`.
This mis-partitions the options: it treats PHYS 5A–5M as always-required and
puts PHYS 5N in a branch by itself, so the "PHYS 5 series OR PHYS 6 series"
choice is lost (a student could satisfy it with PHYS 5A–5M + PHYS 6 series).

**Smallest correct representation**: `"op": "options"`, `courses: []`,
`branches: [["PHYS5A","PHYS5B","PHYS5C","PHYS5L","PHYS5M","PHYS5N"],
["PHYS6A","PHYS6B","PHYS6C","PHYS6L","PHYS6M","PHYS6N"]]`.

## Section: Electives — count of two dropped

**What the page says**:

```
[h3 sc-level-1] Electives
  P: Plus two chemistry upper-division electives from the following:
    (16 courses)
```

Two courses must be chosen from the enumerated 16-course pool.

**What the JSON has**: `"op": "list"`, `"n": null`. `list` denotes a pool
drawn from by a separate counting parent; there is no counting parent here,
so the stated count of two is dropped from the machine-readable requirement.

**Smallest correct representation**: `"op": "n_of"`, `"n": 2` over the same
16-course list.
