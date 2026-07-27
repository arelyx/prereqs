# Verification report: physics-astrophysics-bs

## Discrepancy 1 — Upper-Division lab options: "any three of" ASTR 136A-H flattened into single-course branches

**Section title:** Upper-Division Courses / "Plus one of the following options:"

**What the page says (rendered lines):**

> [h5 sc-level-3] Plus one of the following options:
>     >> NARRATIVE MARKER [either-this-course]: ''
>     * PHYS 135 /ASTR 135
>     >> NARRATIVE MARKER [or-these-courses]: ''
>     * PHYS 135A /ASTR 135A
>     * PHYS 135B /ASTR 135B
>     >> NARRATIVE MARKER [or-this-course]: ''
>     * ASTR 136
>     >> NARRATIVE MARKER [phys-astrophysics]: 'or any three of these courses'
>     * ASTR 136A ... * ASTR 136H

The fourth narrative branch requires ANY THREE of the seven courses
ASTR 136A/B/C/D/E/G/H.

**What the JSON has:**

An `options` rule whose branches are `[PHYS135]`, `[PHYS135A, PHYS135B]`,
`[ASTR136]`, and then SEVEN separate single-course branches — `[ASTR136A]`,
`[ASTR136B]`, ... `[ASTR136H]` — plus a note
`"[unstructured alternative] or any three of these courses"`. As encoded,
completing a single ASTR 136x course satisfies the whole requirement,
contradicting the page's stated count of three. The branch partitioning
does not match the narrative markers, and the stated n (three) is not
machine-represented.

**Smallest correct representation:**

Represent the fourth narrative group as one branch requiring 3 of the 7
courses — e.g. keep `op: "options"` with branches
`[PHYS135]`, `[PHYS135A, PHYS135B]`, `[ASTR136]`, and a fourth branch that
is an n_of sub-rule (n=3 over ASTR136A, ASTR136B, ASTR136C, ASTR136D,
ASTR136E, ASTR136G, ASTR136H) — or an equivalent section_choice structure
with a `n_of` (n=3) rule for that group.

## Discrepancy 2 — Comprehensive Requirement: same flattening

**Section title:** Comprehensive Requirement

**What the page says (rendered lines):**

Identical structure to Discrepancy 1 (PHYS 135; or PHYS 135A+135B; or
ASTR 136; **or any three of** ASTR 136A-H):

> [h4 sc-level-2] Comprehensive Requirement
> P: The comprehensive requirement is satisfied by completing one of the following options:
> (same four narrative-marker groups as above)

**What the JSON has:**

The same `options` rule with ASTR 136A-H as seven independent
single-course branches and the count of three relegated to the note
`"[unstructured alternative] or any three of these courses"`.

**Smallest correct representation:**

Same fix as Discrepancy 1.

(All other sections match: transfer screening, major qualification
(all_of PHYS 5A/5B/5C with GPA prose constraints), the eight lower-division
rules, the nine-course upper-division all_of, electives n_of 3 with
cross-listings as primary codes (AM 107, PHYS 130), and the DC options
PHYS 182 vs PHYS 195A+195B.)
