# legal-studies-ba — verification failures

## 1. Section: Disciplinary Communication (DC) Requirement / "Senior Thesis" — operator `unknown`

**Page says** (rendered snapshot):

```
[h4 sc-level-2] Disciplinary Communication (DC) Requirement
  P: ... The DC requirement in legal studies is satisfied by completing one of the following two options:
[h5 sc-level-3] Senior Seminar
    * LGST 196
[h5 sc-level-3] Senior Thesis (two or three quarters)
    * LGST 195A
    * LGST 195B
    * LGST 195C
```

Two options: LGST 196, **or** the senior-thesis sequence (LGST 195A + 195B,
plus 195C for the three-quarter version).

**What the JSON has**: a `section_choice` parent with the Senior Seminar
subrule as `all_of [LGST196]` (correct), but the Senior Thesis subrule as
`"op": "unknown"`, `"needs_review": true`. An unknown operator leaves the
thesis completion path unresolved.

**Smallest correct representation**: the thesis subrule as `all_of`
(LGST 195A + LGST 195B, with LGST 195C optional carried as a note), or an
`n_of` reflecting the two-or-three-quarter span — matching the repeatability
convention used elsewhere in the corpus.

## 2. Section: Comprehensive Requirement / "Senior Thesis (2-3 quarters)" — coded as `info` (option dropped)

**Page says**:

```
[h4 sc-level-2] Comprehensive Requirement
  P: Students can satisfy the senior comprehensive requirement in the legal studies major by successfully completing one of the following two options:
[h5 sc-level-3] Senior Capstone
    * LGST 196
[h5 sc-level-3] Senior Thesis (2-3 quarters).
    * LGST 195A
    * LGST 195B
    * LGST 195C
```

Two options: the capstone (LGST 196) **or** the senior thesis sequence.

**What the JSON has**: a `section_choice` parent, the Senior Capstone subrule
as `all_of [LGST196]`, but the Senior Thesis subrule as `"op": "info"`.
`info` means advisory/never-required, so the thesis ceases to be a valid
completion path and the `section_choice` effectively offers only the
capstone.

**Smallest correct representation**: the thesis subrule as `all_of`
(LGST 195A + LGST 195B, LGST 195C optional as a note), parallel to the DC
fix above, so the `section_choice` genuinely offers both options.

## 3. (Secondary) Section: Upper-Division / "Thematic Core Course Requirement — 6 courses" — "minimum of one in each of the three thematic areas" not enforced

**Page says**:

> P: Legal studies majors are required to take six thematic core courses,
> with a minimum of one in each of the three thematic areas: A. Theory /
> B. Public Law and Institutions / C. Law and Society

**What the JSON has**: a single `n_of`, `n: 6`, `from_following_lists: true`
parent drawing on the three theme lists, with **no** constraint/note
capturing the "minimum one per area" distribution (the text survives only in
`source.prose`).

**Smallest correct representation**: `n_of_groups` with n=6 over the three
theme groups (each group min 1), or the existing `n_of` with the
per-area-minimum kept as an explicit `constraints` entry.
