# Verification report: applied-linguistics-and-multilingualism-ba

## Discrepancy 1 — Electives: missing count (op/list misuse)

**Section title:** Electives

**What the page says (rendered lines):**

> [h4 sc-level-2] Electives
> P: (20 credits total)
> P: Four upper-division (5-credit) electives from the following list are required, at least three of which must be APLX courses. Additional courses can be considered, pending approval by the APLX faculty director. Courses used to fulfill the advanced language proficiency requirement cannot be counted toward the APLX electives.

The page states an explicit count: **four** electives from the list.

**What the JSON has:**

The single Electives rule uses `"op": "list"` with `"n": null`. There is no
counting parent rule that draws on this pool, so the required count of 4 is
not machine-represented anywhere; it survives only inside a prose
`constraints` entry.

**Smallest correct representation:**

Change the rule to a counting operator with the stated n:

```json
"op": "n_of",
"n": 4
```

(keeping the same `courses` list, and keeping the "at least three of which
must be APLX courses" rider as a prose constraint, which is an accepted
approximation).
