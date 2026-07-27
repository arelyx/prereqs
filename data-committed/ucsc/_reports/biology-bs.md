# Verification report: biology-bs

## Discrepancy 1 — DC Requirement: either/or not encoded as section_choice

**Section title:** Disciplinary Communication (DC) Requirement

**What the page says (rendered lines):**

> [h4 sc-level-2] Disciplinary Communication (DC) Requirement
> P: The DC requirement in the biology B.S. degree can be satisfied either by completing two BIOE courses or by completing one 5-credit BIOL lab.
> [h5 sc-level-3] For the BIOE option, choose two Ecology and Evolutionary Biology courses from this group: ...
> [h5 sc-level-3] For the BIOL option, choose one course from this group: ...

The two sub-headings are alternative ways to satisfy the DC requirement —
a student completes ONE of the two options.

**What the JSON has:**

The DC section's header rule is `"op": "info"` (advisory, never required),
followed by two sibling rules: an `n_of` (n=2, BIOE group) and a `one_of`
(BIOL group). Sibling rules in a section read conjunctively, so the JSON
represents the DC requirement as requiring BOTH two BIOE courses AND one
BIOL lab, contradicting the page's either/or phrasing.

**Smallest correct representation:**

Change the header rule's op from `"info"` to `"section_choice"` (the
choose-one-of-the-following-subrules marker, as used in e.g.
marine-biology-bs), leaving the two option rules as its branches:

```json
"op": "section_choice"
```

(The membership and counts of both option groups themselves are correct:
26 BIOE courses with n=2, and 15 BIOL/CHEM/METX lab courses as one_of.)
