# Program verification method (for Frontier-LLM verifier agents)

You are verifying that a program's committed requirements JSON faithfully
represents its official catalog page. Work entirely offline against the
snapshot — never fetch the live site.

## Inputs, per program slug

1. Ground truth: `cd pipelines && .venv/bin/python -m ucsc.major_requirements.render_page <slug>`
   (headings with sc-levels, course rows, narrative markers, prose, notes).
2. Candidate: `data-committed/ucsc/programs/<slug>.json`.

## What to check (every requirement-bearing section)

- **Membership**: every course on the page appears in the right rule; no
  extra courses; cross-listing riders (`/CSE 185S`) may be represented by the
  primary code only.
- **Operator**: all_of / one_of / n_of (+ correct n) / options (branches
  match the narrative-marker partitioning) / n_of_groups (n and group
  branches) / range (filter's include/exclude ranges, series, codes match
  the prose) / section_choice (choose-one-of-the-following-subrules)
  / list (a pool drawn from by a counting parent) / category_count
  (count with genuinely unlisted membership) / info (advisory or policy
  prose, never required).
- **Counts**: every n matches the page's stated count (words or digits).
- **DC and Comprehensive semantics** match the page's phrasing.
- **Concentrations**: each concentration's rules attributed to the right
  concentration.

## Deliberate approximations that COUNT AS PASS (do not report)

- Prose constraint riders ("at least three from list A", pair
  substitutions, double-count bans) carried as `constraints`/`notes` text
  rather than machine-enforced.
- `category_count` with `needs_review`/manual-check for genuinely
  unenumerated categories ("one upper-division elective").
- Planners sections excluded; qualification/screening segregated from
  degree requirements; advisory/"recommended" content as `info`.
- Repeatability subtleties (e.g. "three quarters of" an ensemble counted as
  n distinct courses).
- `info_sections` completeness (introduction/outcomes) — out of scope.

## Verdict handling

**PASS** — edit ONLY the `verification` block of the JSON file to:
```json
"verification": {"status": "frontier-verified", "date": "2026-07-26",
  "notes": "<1-3 sentences: what was checked; any in-scope approximations observed>"}
```
Change nothing else in the file; preserve formatting (2-space? match the
existing indent=1 style; safest: edit just the block via a small Python
snippet with json load/dump sort_keys=True indent=1 + trailing newline).

**FAIL** — do NOT touch the JSON. Write
`data-committed/ucsc/_reports/<slug>.md` containing, per discrepancy:
section title, what the page says (quote the rendered lines), what the JSON
has, and the smallest correct representation. Then also set the verification
block to `{"status": "failed-verification", "date": "2026-07-26", "notes":
"see _reports/<slug>.md"}` (same edit rules).

Report totals in your final message: `<n> PASS, <n> FAIL, slugs of failures`.

## Repair protocol (for report-guided repair agents)

For a program with `failed-verification` and a report in `_reports/<slug>.md`:

1. Read the report AND re-render the page yourself (render_page) — the
   report's "smallest correct representation" is a proposal, not gospel;
   confirm it against the page before applying.
2. Edit `data-committed/ucsc/programs/<slug>.json` to fix EXACTLY the
   reported discrepancies (plus anything the report missed that you catch):
   minimal, surgical changes to the affected rules only. Valid ops:
   all_of, one_of, n_of (+n), options (branches), n_of_groups (n+branches),
   range (n + filter {include_ranges,include_series,exclude_ranges,
   exclude_codes}), section_choice, category_count (+n, for genuinely
   unlisted membership), list (pool under a counting parent), info
   (advisory/policy only). A counting parent drawing from following list
   pools carries "from_following_lists": true; a parent counting a
   materialized union carries "pool": [codes].
3. Set top-level `"origin": "hand-edited"` (protects the file from pipeline
   overwrites) and the verification block to frontier-verified with notes
   "hand-corrected per _reports/<slug>.md: <one-line summary>".
4. Re-verify your own edit against the rendered page before finishing.
5. JSON dump: json.dumps(obj, indent=1, ensure_ascii=False, sort_keys=True)
   + trailing newline. NEVER default ensure_ascii (it mangles em-dashes).
6. Delete the report file after a successful repair (git history keeps it).
