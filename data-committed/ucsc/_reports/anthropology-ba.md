# anthropology-ba — verification failures

## 1. Upper-Division Courses > "Five core requirements" recorded as `info` (requirement dropped)

**Page says** (rendered source):

```
[h5 sc-level-3] Five core requirements
  LI: one course in anthropological theory
  LI: one course in sociocultural anthropology
  LI: one course in regional specialization
  LI: one course in archaeology
  LI: one course in biological, medical or environmental anthropology
  P: For course offerings, see the section Courses in Anthropology by Category . Students may not substitute coursework from another program or institution for core courses.
```

These five courses are required (they are 5 of the "Ten upper-division courses").

**JSON has**: a single rule with `"op": "info"`, `courses: []`, `n: null` under heading
"Five core requirements". Per the schema, `info` is advisory/policy prose and never
required, so the five core-course requirements are lost from the machine representation.

**Smallest correct representation**: a `category_count` rule with `n: 5` and
`needs_review: true` (categories are genuinely unenumerated on this page — "see Courses
in Anthropology by Category"), carrying the five category lines in notes/source; or five
`category_count` rules with `n: 1`, one per category.

## 2. DC Requirement: seminar-vs-thesis choice lost; thesis made mandatory

**Page says**:

```
P: To satisfy the DC requirement students must complete a senior seminar series course or complete an independent senior thesis following the guidelines below.
[h5 sc-level-3] Senior Seminar
  P: Either a course in the ANTH 194 series or a course in the ANTH 196 series.
[h5 sc-level-3] Senior Thesis
    >> NARRATIVE MARKER [either-these-courses]: ''
    * ANTH 195A / ANTH 195B / ANTH 195C
    >> NARRATIVE MARKER [or-this-course]: ''
    * ANTH 195S
```

**JSON has**: in section "Disciplinary Communication (DC) Requirement", the Senior
Seminar path is an `info` rule (never required, no courses) and the Senior Thesis path is
a required `options` rule with branches [ANTH195A, ANTH195B, ANTH195C] / [ANTH195S]. The
only requirement-bearing rule in the section is the thesis, so the JSON asserts every
student must complete a thesis, while the seminar alternative disappears.

**Smallest correct representation**: a `section_choice` rule with two subrules:
(a) Senior Seminar — a `range`/series rule over the ANTH 194 series and ANTH 196 series
(or `category_count` n=1 with needs_review), and (b) Senior Thesis — the existing
`options` rule with branches [ANTH195A, ANTH195B, ANTH195C] and [ANTH195S].

## 3. Comprehensive Requirement: same choice lost (same shape as #2)

**Page says**:

```
P: The senior comprehensive requirement can be satisfied in one of two ways:
[h5 sc-level-3] Senior Seminar
  P: Either a course in the ANTH 194 series or a course in the ANTH 196 series.
[h5 sc-level-3] Senior Thesis
    >> NARRATIVE MARKER [either-this-course]: ''
    * ANTH 195S
    >> NARRATIVE MARKER [or-these-courses]: ''
    * ANTH 195A / ANTH 195B / ANTH 195C
```

**JSON has**: in section "Comprehensive Requirement", Senior Seminar is an `info` rule
and Senior Thesis is a required `options` rule (branches [ANTH195S] / [ANTH195A,
ANTH195B, ANTH195C]) — the thesis becomes unconditionally mandatory and the seminar path
is dropped.

**Smallest correct representation**: `section_choice` with the two subrules as in #2.
