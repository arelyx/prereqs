# spanish-studies-minor — verification failures

## Sections: Lower-Division track choice

**What the page says**:

```
[h4 sc-level-2] Either six courses in the regular track
    * SPAN 1, SPAN 2, SPAN 3, SPAN 4, SPAN 5, SPAN 6
  NOTE: Or equivalent proficiency. SPAN 5M may substitute for SPAN 5 .
[h4 sc-level-2] Or three courses in the Spanish for Heritage Speakers (SPHS) track
    * SPHS 4, SPHS 5, SPHS 6
  NOTE: or equivalent proficiency
```

This is one requirement satisfied by **either** the regular track **or** the
SPHS track (the headings begin "Either ..." / "Or ...").

**What the JSON has**: two separate sections, each containing an independent
required rule — `n_of` n=6 over SPAN 1-6 and `n_of` n=3 over SPHS 4-6 —
with no `options`/`section_choice` structure linking them. As encoded, a
student must complete BOTH tracks (9 courses), which contradicts the page.

**Smallest correct representation**: a single rule with `"op": "options"`
and branches `[[SPAN1..SPAN6], [SPHS4, SPHS5, SPHS6]]` (or a
`section_choice` parent over the two track subrules), keeping the
equivalent-proficiency / SPAN 5M substitution notes as prose.

## Section: Spanish Elective (5 credits) — membership (secondary)

**What the page says**: the elective list contains the single entry
`SPAN 130 /LGST 130A / SPAN 6 / SPHS 6` among the 48 other courses.

**What the JSON has**: SPAN130, SPAN6, and SPHS6 all included as separate
courses in the `one_of` pool (with a note "[equivalent alternates, one
entry]"). Cross-listing riders may be represented by the primary code only;
listing lower-division SPAN 6/SPHS 6 as standalone upper-division elective
options lets a lower-division language course satisfy the 5-credit
upper-division elective.

**Smallest correct representation**: keep only the primary code SPAN 130 in
the pool (rider carried as a note).

All other rules (LING 50, Literature one_of, LIT 189C, SPAN 150,
SPAN 114/SPHS 115) match the page.
