# global-economics-ba — verification failures

Context: the page states these are required components — "In addition, majors must have
language study, area study, and overseas study, as described below" (Upper-Division
Courses prose). All three are represented as `info` rules, which per the schema are
advisory and never required.

## 1. Area Study: stated count of two courses dropped (`info`, no n)

**Page says** (rendered source):

```
[h5 sc-level-3] Area Study
  P: The major requires students to take two additional courses selected from the offerings of departments other than economics in order to learn about the history, political economy, or culture of some other part of the world. These can be lower- or upper-division courses; the courses must focus on the area of the student’s language study and overseas study. The Economics Department provides a list of approved courses as a reference. The area studies course plan must be pre-approved by an economics advisor. ...
```

**JSON has**: `"op": "info"`, `n: null` (prose carried as a constraint). The stated
count (two courses) and the required status are lost from the machine representation.

**Smallest correct representation**: `"op": "category_count"` with `n: 2` and
`needs_review: true` (membership genuinely unenumerated — department-approved list),
keeping the prose as source/notes.

## 2. Foreign Language Study: required language-through-level-6 recorded as `info`

**Page says**:

```
[h5 sc-level-3] Foreign Language Study
  P: The global economics major requires a foreign language ... Students can meet this requirement be completing level 6 of a language course offered at UC Santa Cruz or its equivalent. ...
```

(The Transfer section repeats: "This major requires students to complete a language of
their choosing through level 6 (two-year equivalent).")

**JSON has**: `"op": "info"` with no constraints/notes flagged — a required component
rendered as advisory prose.

**Smallest correct representation**: `"op": "category_count"` with `needs_review: true`
(unenumerable membership: any UCSC language sequence through level 6), prose retained.

## 3. Study Abroad: required term abroad recorded as `info`

**Page says**:

```
[h5 sc-level-3] Study Abroad
  P: All students are required to spend at least one term abroad in an approved course of study in their regional area of concentration; ...
```

**JSON has**: `"op": "info"` with the prose as a constraint — advisory only.

**Smallest correct representation**: a `category_count`-style rule with
`needs_review: true` (non-course requirement, manual check), so the requirement is not
presented as optional.
