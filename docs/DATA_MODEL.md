# Data model

Two layers: the **committed dataset** (`data-committed/ucsc/`, canonical,
written by hot-path exporters) and **Postgres** (a projection of it loaded by
`backend/app/loaders/ucsc.py`, plus user tables). Harness files
(`harnesses/`) are described in `docs/HARNESSES.md`.

## Conventions

- Course codes are canonical: uppercase, no space (`CSE12`, `MATH19B`);
  `display_code` keeps the human form (`CSE 12`).
- Term codes are pisa STRMs: `2` + YY + season digit (`0` winter, `2` spring,
  `4` summer, `8` fall). `int(code)` sorts chronologically; Fall belongs to
  the year it starts (Fall 2026 = `2268`, opening academic year 2026-27).
- Catalog editions are `YYYY-YY` (`2026-27`).
- Offerings reference courses **by code string** (old terms use retired
  codes such as `CMPS`); `course_id` FKs are nullable "resolved against the
  current catalog" links.
- Committed JSON uses the canonical dump (`ucsc.ledger.dump`); JSONL files are
  one object per line, sorted — so git diffs are reviewable.

## Committed dataset (`data-committed/ucsc/`)

| Path | Shape |
|---|---|
| `ledger.json` | what every source was built from and when — see `docs/REFRESH.md` §2 |
| `index.json` | counts (courses, subjects, legacy programs) |
| `courses/<SUBJ>.json` | `{subject, catalog_year, origin, provenance{parser_version, overrides_sha1}, courses: [Course]}` |
| `offerings/<term>.jsonl` | one pisa section per line: `course_code, section, class_number, title, instructors[] (names, "Last,F."), days_times, location, modality, enrolled, capacity, status` |
| `soe/<academic-year>.jsonl` | one planned section per line: `course_code, dept, display_code, section, title, instructors[{name, cruzid}], modality_note, term{academic_year, quarter, term_code}` |
| `editions/<ed>/programs.json` | `[{slug, name, degree, kind, division, department, url, edition, archive_url, source_sha256, skeleton_sha256}]` |
| `editions/<ed>/sources/<slug>.md` | normalized official page text (format: `pipelines/ucsc/major_requirements/source_text.py`) |
| `programs/<slug>.json` | legacy generic-JSON harness (approach A), edition 2026-27, frozen |

`Course` (in `courses/<SUBJ>.json`):

```json
{"code": "CSE100", "display_code": "CSE 100", "subject": "CSE", "number": "100",
 "title": "Logic Design", "credits": "5", "division": "upper",
 "description": "...", "ge_codes": [], "cross_listed": [], "formerly": null,
 "repeatable": false, "catalog_instructor": null, "quarters_offered_text": null,
 "raw_requirements": "Prerequisite(s): CSE 12 ; previous or concurrent enrollment in CSE 100L is required.",
 "prereq_groups": [["CSE12"], ["CSE100L"]],
 "concurrent_ok": ["CSE100L"],
 "coreqs": [],
 "prereq_source": "parser",
 "url": "/en/current/general-catalog/courses/...", "extra_fields": {}}
```

- `prereq_groups` — CNF: outer list ANDed, inner lists ORed; `[]` = no course
  prereqs; `null` = undecidable text with no override (shown as "check the
  catalog"). Produced by `catalog_courses/prereq_parse.py`; "k of n" phrases
  are expanded exactly into CNF.
- `concurrent_ok` — codes in `prereq_groups` that may be taken the same
  quarter ("previous or concurrent enrollment in X").
- `coreqs` — CNF of strict co-requisites ("concurrent enrollment in X is
  required"): same quarter or earlier.
- `prereq_source` — `parser` | `override` (warm-path entry in
  `prereq_overrides.json`, pinned to the text hash) | `unresolved` | `none`.
- `division` — from the catalog URL; where a department files courses under
  numeric segments, from the number (1–99 lower, 100–199 upper, 200+ graduate).

## Postgres — catalog tables (loader-owned, read-only at request time)

- **universities** — `id` (`ucsc`), `name`, `term_system`, `catalog_year`.
- **terms** — `code`, `year`, `season`, `sort_key`; unique `(university_id, code)`.
- **courses** — the Course fields above (`prereq_groups`, `coreqs` JSONB;
  `concurrent_ok`, `ge_codes`, `cross_listed` arrays) + `dormant` (no
  offerings in the committed window). Unique `(university_id, code)`; ids are
  preserved across loads.
- **course_prereq_edges** — derived from `prereq_groups`; powers "what does
  this unlock".
- **course_offerings** — one row per section per term (`source` `pisa|soe`,
  `is_planned` for SOE rows).
- **course_availability** — derived: `season_counts` (last 5 years),
  `last_offered_term_code`, `next_planned`, `predicted_instructors`.
- **programs** — one row per **(slug, catalog edition)**: `name` (index
  anchor text, never the slug), `degree` (`BA|BS|BM|minor`), `kind`,
  `division`, `department`, `url` (edition-pinned for archived editions),
  `catalog_year` (edition id), `archive_url`, `source_md`, `source_sha256`,
  `requirements` (legacy generic JSON, 2026-27 only), `verification`.
  Unique `(university_id, slug, catalog_year)`.
- **pipeline_runs** — one row per loaded source with a provenance manifest.

## Postgres — user tables

- **users** — `id` uuid, `email` unique, `password_hash` (argon2id), `created_at`.
- **auth_tokens** — sha256 of opaque bearer tokens, expiry, last use.
- **plans** — `id`, `user_id`, `university_id`, `name`, `program_ids` int[]
  (program rows, so they imply an edition), `content` JSONB, timestamps. Max 20
  per user. Which plan is active is client-side state only.

Plan `content` is exactly the per-plan localStorage shape, so anonymous plans
import losslessly:

```json
{"completed": ["CSE12", "MATH19A"],
 "terms": [{"term_code": "2268", "courses": ["CSE101", "CSE120"]}],
 "catalog_year": "2026-27",
 "choices":  {"literature-ba": {"concentration": "Creative Writing"}},
 "attested": {"music-bm": ["juries"]},
 "grades":   {"MATH19A": "B+"}}
```

`catalog_year` null = newest edition; all `program_ids` must belong to the
plan's edition (422 otherwise). `choices` / `attested` are keyed by program
slug and interpreted by that program's harness.

Anonymous storage: `localStorage["prereqs.plans.v2"] = {"plans": [{"id",
"planName", "programIds", "serverPlanId", "rev", "content"}], "activeId",
"deleted": [...]}` — `rev` orders cross-tab merges, `deleted` tombstones
(capped at 100) stop deleted plans resurrecting. The legacy single-plan key
`prereqs.plan` is migrated once on load.

Validation results (prereq issues, availability warnings, GE and program
progress) are computed on request, never stored.

Harness interpretation of the per-program keys (approach C): `choices[slug]`
holds the harness's declared choice keys (e.g. `concentration`, `language`,
`intensive`, `entry`, `bm_start` as a term code, anthropology category →
course code); `attested[slug]` holds attestation **ids** declared by that
harness (`juries`, `senior-recital`, `language-exam`…). Degree progress
from harnesses is computed in the browser, never stored.

## Catalog facts for harnesses

`GET /u/{univ}/catalog/compact[?describe=LIT,PSYC]` →
`{"described": [...], "courses": [{code, display_code, subject, number,
credits, division, title, cross_listed?, repeatable?, description?}]}` —
every course (≈970 KB raw, ≈190 KB gzipped with LIT+PSYC descriptions);
descriptions only for the subjects a harness lists in `catalogNeeds`. Node
tooling reads the same facts from `data-committed/ucsc/courses/*.json`.
