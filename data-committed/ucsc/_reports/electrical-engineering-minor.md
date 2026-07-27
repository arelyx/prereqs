# electrical-engineering-minor — verification failures

## 1. Electives > "Computer Science and Engineering" (CSE 150) recorded as required (`all_of`)

**Page says** (rendered source):

```
[h5 sc-level-3] Communications Signal Processing Concentration
[h6 sc-level-4] Electrical and Computer Engineering
    * ECE 118
    ... (22 courses)
[h6 sc-level-4] Computer Science and Engineering
    * CSE 150
```

and identically under the Control and Signal Processing Concentration. CSE 150 is a
member of the concentration's elective pool ("Plus at least 15 additional credits ...
from the lists below"), not a required course.

**JSON has**: two rules in the Electives section with `"op": "all_of"` and
`courses: ["CSE150"]` (headings "Computer Science and Engineering") — CSE 150 is
asserted as unconditionally required for the minor.

**Smallest correct representation**: `"op": "list"` (pool member list feeding the
Electives credit requirement), same as its sibling ECE pool, one per concentration.

## 2. Electives: concentration pools left as `op: "unknown"` instead of `list`

**Page says**: each concentration heading is followed by an elective pool from which
"at least 15 additional credits" must be drawn, all from the same concentration.

**JSON has**: the six ECE pool rules (Communications SP, Control SP, Electronics and
Photonics, Power and Energy, Robotics and Automation, Digital Hardware) carry
`"op": "unknown"`, `needs_review: true`. Course membership of every pool matches the
page exactly (ECE 253/CSE 208 carried as primary code), and the 15-credit /
same-concentration rider is carried as constraint prose on the section's `info` rule,
but the pools are unclassified rather than typed as pools.

**Smallest correct representation**: `"op": "list"` on each pool rule (membership
unchanged), with the credit-count rider remaining as constraint text; ideally each rule
tagged with its concentration (the two identical "Electrical and Computer Engineering"
headings are distinguishable only by ordering today).
