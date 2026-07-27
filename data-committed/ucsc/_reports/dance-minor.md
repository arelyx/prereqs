# dance-minor — verification failures

Ground truth: `render_page dance-minor` (snapshot 20260727T041640Z).
Candidate: `data-committed/ucsc/programs/dance-minor.json`.

## 1. Exclusion list encoded as an unresolved course rule (`op: "unknown"`)

Page (Course Requirements, final h4):

> [h4] The following DO NOT satisfy the dance minor requirements:
>     * THEA 55A
>     * THEA 55B
>     * THEA 158
>     * THEA 190
>     * THEA 198
>     * THEA 199

JSON: a section whose single rule has `"op": "unknown"`,
`"needs_review": true` and `courses: [THEA55A, THEA55B, THEA158, THEA190,
THEA198, THEA199]`. `unknown` is not a valid operator, and the rule shape
(courses attached to a rule inside the requirements sections) invites reading
these six courses as a requirement when the page states the opposite — they
are explicitly excluded from satisfying the minor.

Smallest correct representation: `"op": "info"` with the exclusion recorded in
`notes`/`constraints` text (e.g. "THEA 55A, 55B, 158, 190, 198, 199 do NOT
satisfy dance minor requirements"), courses list empty.

## Sections verified with no discrepancy

Creative-practice one_of (THEA 30/36), cross-cultural one_of (9 courses),
THEA 50 all_of, upper-division creative one_of (6 courses), critical-studies
one_of (7 courses, cross-lists as primary codes), and the n_of-3 electives with
double-count/repeatability riders (THEA 139 up to two) carried as notes — an
in-scope approximation.
