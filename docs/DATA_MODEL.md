# Data Model

Postgres schema serving the app. Everything data-sourced is scoped by `university_id`; users pick one university. Pipelines write snapshots (see ARCHITECTURE.md); a loader applies a snapshot to these tables transactionally.

## Conventions

- Course codes are stored canonically: uppercase, no internal space (`CSE12`, `MATH19B`). `display_code` keeps the human form (`CSE 12`).
- Historical data (offerings from 2004+) references courses **by code string**, not FK — old codes (`CMPS`, `AMS`) may not exist in the current catalog. `course_id` FKs are nullable "resolved against current catalog" links.
- Structured-but-tree-shaped data (prereq groups, requirement rules, plan contents) is JSONB with a documented shape below; combinator evaluation happens in backend code, not SQL. Flat derived tables (`course_prereq_edges`, `course_availability`) exist where SQL needs to query the graph.

## Catalog tables

**universities** — `id` (slug pk: `ucsc`), `name`, `term_system` (`quarter|semester`), `catalog_year` (e.g. `2026-2027`).

**terms** — `id` pk, `university_id`, `code` (pisa code, e.g. `2268`), `year`, `season` (`fall|winter|spring|summer`), `sort_key` int (chronological). Unique `(university_id, code)`.
UCSC term-code math: `2000 + (year-2000)*10 + {0:winter, 2:spring, 4:summer, 8:fall}`; fall codes belong to the academic year starting that fall.

**courses** — `id` pk, `university_id`, `code` unique-per-univ, `subject`, `number`, `display_code`, `title`, `description`, `credits` (text: may be a range), `division` (`lower|upper|graduate`), `ge_codes` text[] (deterministic from catalog), `quarters_offered_text` (catalog prose, <1% coverage — availability really comes from offerings), `catalog_instructor` (dept-dependent coverage), `cross_listed` text[] (codes), `formerly` text, `repeatable` bool, `url`, `raw_requirements` text (source prose, kept for audit), `prereq_groups` JSONB, `is_active` bool (still in current catalog).

`prereq_groups` shape (from the POC, LLM-structured, hallucination-guarded):
```json
[["CSE12", "BME160"], ["CSE16"]]   // AND of OR-groups
```

**course_prereq_edges** — derived at load from `prereq_groups`: `course_id`, `prereq_code`, `prereq_course_id` nullable. Powers post-req ("what does this unlock") queries.

**course_offerings** — one row per section per term: `id`, `university_id`, `term_id`, `course_code`, `course_id` nullable, `section`, `class_number`, `title`, `instructors` JSONB (list of `{name, cruzid?}`; pisa names are `Last,F.M.`, `Staff` = TBD), `days_times`, `location`, `modality`, `enrolled`, `capacity`, `status`, `source` (`pisa|soe`), `is_planned` bool (SOE future schedule = plan, not record).

**course_availability** — derived per course at load: `course_id` pk, `season_counts` JSONB (`{"fall": 12, "winter": 3, ...}` over last N years), `last_offered_term_code`, `next_planned` JSONB (`[{term_code, source, instructors}]` from SOE + future pisa), `predicted_instructors` JSONB (ranked `[{name, score, evidence}]` from recency-weighted history), `computed_at`.

**programs** — `id`, `university_id`, `name` (from index anchor text — never from slug; slugs have CMS artifacts like `copy-of-physics-bs`), `degree` (`BA|BS|BM|minor`), `kind` (`major|minor`), `division`, `department`, `slug`, `url`, `catalog_year`, `requirements` JSONB (below), `verification` (`verified|unverified|failed`), `verified_at`, `verification_notes`.

`requirements` shape (mirrors docs/universities/ucsc/source-major-requirements.md taxonomy):
```json
{ "sections": [
  { "kind": "lower_div|upper_div|electives|dc|comprehensive|qualification|screening|concentration|other",
    "title": "...", "concentration": null,
    "rules": [
      { "op": "all_of|one_of|n_of|options|category_count|range|distribution|external",
        "n": 4,
        "courses": ["CSE12", "..."],
        "branches": [["PHYS5A","PHYS5M"], ["ECE9"]],
        "constraints": [{"type": "min_from|max_from|pair_substitution|exclude", "...": "..."}],
        "source": {"heading": "...", "prose": "..."},
        "notes": ["CSE 195 may be used either as an elective or DC, not both"] }
    ] }
]}
```
Deterministic layer owns course *membership* (from `sc-*` classed tables); the small LLM only decides combinators/counts from heading+prose; both stay auditable via `source`.

## User tables

**users** — `id` uuid pk, `email` unique, `password_hash` (argon2id), `created_at`. Deleting a user cascades to tokens and plans.

**auth_tokens** — `id`, `user_id` FK cascade, `token_hash` (sha256 of the opaque bearer token; plaintext never stored), `created_at`, `expires_at`, `last_used_at`. Isolated in `app/auth/` for the later Clerk swap.

**plans** — `id`, `user_id` FK cascade, `university_id`, `name`, `program_ids` int[] (chosen major(s)/minor(s)), `content` JSONB, `created_at`, `updated_at`. `content` is exactly the localStorage shape so anonymous plans import losslessly:
```json
{ "completed": ["CSE12", "MATH19A"],
  "terms": [{"term_code": "2270", "courses": ["CSE101", "CSE120"]}] }
```
Validation (missing prereqs, not-offered warnings, requirement/GE progress) is computed by the API on read, never stored.

## Provenance

**pipeline_runs** — `id`, `university_id`, `source` (`catalog_courses|pisa_offerings|soe_schedule|major_requirements`), `snapshot_path`, `status` (`succeeded|failed|aborted`), `started_at`, `finished_at`, `manifest` JSONB (git sha, model, prompt version, counts, guard results), `loaded_at` (null until applied to the DB; rollback = re-run the loader on an older snapshot's run row).
