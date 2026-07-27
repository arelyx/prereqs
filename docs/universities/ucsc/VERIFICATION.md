# UCSC major-requirements verification log

Method: for each program, the raw catalog page (from the fetch snapshot) is
rendered to a heading/course-list text dump, and every structured rule is
compared against it by hand — operators, counts, course membership, branches,
constraint riders. Programs pass only at 0 unresolved codes and 0
misclassified rules. The machine-readable registry the loader consumes is
the `verification` block inside each `data-committed/ucsc/programs/<slug>.json` file.

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

## Hardening round 2026-07-26 (user-reported: Film & Digital Media)

Root causes found and fixed, each generalized + regression-tested:
9. Prose-range elective memberships (multi-range, series, both exclusion
   grammars) — Film minor.
10. Parent/child combinators: 'N from each of the following groups' (children
    → one_of / n_of; totals pool over children), 'one course from N of M
    groups' (new n_of_groups op), count headers with enumerated children.
11. Over-greedy vocabulary: unanchored 'the following courses' swallowed
    counted phrases (Music/Theater/TIM); 'satisfied by' ≠ all_of (Biology DC
    is 'satisfied by completing TWO of ...').
12. Course numbers misread as counts ('AM 115' → n=115) — digit counts
    bounded + subject-lookbehind.
13. Confidence bounds: bare-heading all_of capped at 12 courses (largest
    verified required list is EE's 11); the same cap vetoes LLM 'take all'
    answers on big lists into needs_review.
14. Advisory content ('Recommended Course for Transfer Students') is now a
    note, never a requirement — this CORRECTED two hand-verified programs
    (Math BS MATH 24, EE transfer-prep pool), i.e. the automated bounds
    caught errors the manual pass had missed in hidden qualification
    sections.

Post-hardening audit across all 119 programs: zero n>pool rules, zero
bare all_of rules ≥15 courses; verified subset byte-identical except the two
documented corrections.


## Full-catalog verification campaign — 2026-07-26 (catalog 2026-27)

**Every one of the 119 UCSC programs (75 majors, 44 minors) is now
frontier-verified against its official catalog page**, recorded in each
program file's `verification` block in `data-committed/ucsc/programs/`.

Method: 26 Frontier-LLM agents over three waves, all offline against the
fetch snapshot via `render_page`.
- Wave 1 (12 verifiers, all 119): 30 PASS / 89 FAIL with per-slug
  discrepancy reports (git history: `_reports/`).
- Triage: 8 systemic harness fixes grounded in the report corpus (count
  parents, choice structures, filter polarity/membership incl. hybrid
  table∪range pools, exclusion blocks, concentration attribution) + 2
  regression fixes.
- Wave 2 (5 verifiers on 51 regenerated + 5 repairers on 44 unchanged
  fails): 15 verify PASS, 44/44 repaired.
- Wave 3 (4 repairers on the remaining 36): 36/36 repaired.
- Post-audit: one leniently-passed `unknown` op corrected (Applied Physics
  winter-entry rule); machine audit confirms zero invalid ops, zero
  impossible counts, canonical formatting across all files.

Provenance: 39 programs are pure pipeline output that verified as-is; 80
carry `origin: hand-edited` (surgical, report-guided corrections that the
exporter will never silently overwrite). The original wave-1 reports, all
repairs, and every verification stamp are in git history on the
`verification/full-catalog-wave` branch.

Verification is against catalog 2026-27. On the next edition roll: re-run
the pipeline, review the `git diff` of `data-committed/`, and re-verify
only changed programs.
