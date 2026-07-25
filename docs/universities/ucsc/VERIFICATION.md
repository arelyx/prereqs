# UCSC major-requirements verification log

Method: for each program, the raw catalog page (from the fetch snapshot) is
rendered to a heading/course-list text dump, and every structured rule is
compared against it by hand — operators, counts, course membership, branches,
constraint riders. Programs pass only at 0 unresolved codes and 0
misclassified rules. The machine-readable registry the loader consumes is
`pipelines/ucsc/major_requirements/verified.json`.

## Verified 2026-07-25 (catalog 2026-27)

| Program | Result | Notes |
|---|---|---|
| Computer Science B.S. | PASS | Electives = 4 from pool (+2 prose range memberships shown verbatim); DC one-of-3; comprehensive = capstone-list OR senior-thesis (section_choice). |
| Computer Science B.A. | PASS | Breadth = 3 from either list; electives = 3 from pool; CSE 101P/101 alternative. |
| Computer Engineering B.S. | PASS | 4-branch capstone options (123A+B \| 129A-C \| 195 \| 118) from sibling-'Or' headings; 4 concentrations incl. category electives. |
| Electrical Engineering B.S. | PASS | Required Heading5 support; electives = 4 across concentration lists; DC branch [129A, 195, 195] is verbatim page content (two quarters of ECE 195). |
| Mathematics B.S. | PASS | Electives = 3 from self-pool + approved list; DC = MATH 100 + one of 194/195. |
| Economics B.A. | PASS | 6-branch math options; 5 electives across three named lists; min/max list constraints surfaced as prose constraints (not machine-enforced — displayed). |
| Computer Science Minor | PASS | |

## Known, deliberate approximations

- Prose-only pool memberships ("any 5-credit CSE course numbered 100–189…")
  are displayed verbatim but not expanded into course lists; pool counting
  uses the explicit lists. Plans using range-implied courses may undercount
  — the rule row shows the prose so users can self-check.
- Per-list min/max constraints (Econ) and pair-substitution rules (CS BS
  physics pairs) are surfaced as ⚠ constraint text, not enforced.
- `needs_review` rules (231 of ~4,100 across all 119 programs, none in the
  verified subset) render as "manual check" in the UI.

## Every fail-fast catch during bring-up (audit trail)

1. HAVC `courseListHeader` block class (catalog pipeline, full-run 1).
2. CMS byte-identical duplicate course blocks — MATH 24, ANTH 2, HIS 139M
   (catalog pipeline, full-run 2).
3. Narrative slug `either-this-course` (~12 programs; majors full-run 1).
4. Narrative slugs `and`/`or`/`one-of-these-courses` — richer grammar than
   researched; semantics verified on Biology B.A. before implementing
   (majors full-run 2).
5. Free-form narrative markers ('or any three of these courses'), real course
   rows mispointed at narrative-courses (METX 41), prose-only programs
   (History Minor), slash-alternate rows (SPAN 130 / SPAN 6 / SPHS 6)
   (majors full-run 3).
6. `sc-RequiredCoursesHeading5` (EE B.S., deep validation).
7. SOE free-text modality overflow (loader, first real load).
8. pisa 504s/timeouts under monolithic backfill → chunked driver.
