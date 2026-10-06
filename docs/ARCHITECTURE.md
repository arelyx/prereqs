# Architecture

## The problem, and the split it forces

Four kinds of things move at four different speeds:

1. **Facts that change on a schedule and can be scraped mechanically** —
   course descriptions, which sections ran in which term with which
   instructor, next year's Baskin plan, the text of each program page.
2. **Meaning that must be read** — what a program page actually requires:
   "take four, at least two from 101A/B/C", "one ensemble every quarter you
   are in the program", "may not count toward both the elective and DC".
   Every major has its own once-only caveats, so no fixed rule vocabulary
   survives contact with all of them.
3. **Structure** — the planner, the API, the UI shell, the pipeline
   framework. It changes when we decide it should, not when UCSC edits a page.
4. **User data** — accounts and plans. The only state that exists nowhere else.

The repo is organized around that split:

```
                         ┌───────────────────── HOT path — deterministic, no AI ─────────────────────┐
 catalog.ucsc.edu ──┐    │  pipelines/ucsc/*/fetch ─▶ data/ (gitignored raw cache, immutable snapshots) │
 pisa.ucsc.edu ─────┼──▶ │       │ parse / render / export (fail-fast guards: expect())               │
 courses.engineering┘    │       ▼                                                                     │
                         │  data-committed/ucsc/   courses/  offerings/  soe/  editions/<ed>/sources/  │
                         │                         ledger.json  (what we have, as of when)              │
                         └───────────────┬───────────────────────────────────────────────────────────┘
                                         │ change set: refresh status → work order
                         ┌───────────────▼───────── WARM path — frontier agent (Claude Code) ─────────┐
                         │  harnesses/ucsc/<ed>/<slug>/   one program's requirements, as written by an  │
                         │                                agent reading sources/<slug>.md; pinned to   │
                         │                                that text's sha256                           │
                         │  pipelines/ucsc/catalog_courses/prereq_overrides.json  (parser residue)     │
                         │  review: git diff  ·  eval/golden (source-only cases) · harness tests       │
                         └───────────────┬───────────────────────────────────────────────────────────┘
                                         │ loader (transactional, id-preserving)
                         ┌───────────────▼───────── COLD path — structure ─────────────────────────────┐
                         │  backend/   FastAPI · loader · planner engine · auth · transcript import    │
                         │  Postgres   projection of data-committed/ + harnesses/  ·  user tables       │
                         │  frontend/  planner · prereq graph · course drawer · program dashboards     │
                         │  browser    localStorage: anonymous plans (same shape as server plans)       │
                         └──────────────────────────────────────────────────────────────────────────────┘
```

### Delimiters (who may write what)

| Location | Written by | Never written by |
|---|---|---|
| `data/` | fetch stages | anything else (it is a cache; deleting it loses nothing committed) |
| `data-committed/ucsc/{courses,offerings,soe,editions}/`, `ledger.json` | hot-path exporters | humans/agents by hand — the next refresh would overwrite the edit |
| `harnesses/` | warm-path agents | hot path (it only *reports* staleness) |
| `pipelines/ucsc/catalog_courses/prereq_overrides.json` | warm-path agents | hot path (reads it; reports stale entries) |
| `eval/golden/` | test authors, from source text only | anyone looking at a harness |
| Postgres catalog tables | the loader | the API (read-only at request time) |
| Postgres user tables, localStorage | the API / the browser | the loader |

### Request time

The API reads Postgres only; it never touches the network or the committed
files directly. The single exception to "no AI at request time" is
**transcript import**: `POST /u/{univ}/transcript/parse` sends a PDF's text,
one quarter per call, to a local OpenAI-compatible server (llama.cpp
`llama-server`, `qwen3.8-27b`), strictly serialized, in memory only (PII
never persisted or logged), schema-validated, every extracted code checked
against the chunk text and the catalog. Unreachable server ⇒ 503 and the UI
hides the feature.

## Temporal model

- **Catalog edition** (`2026-27`) is the key for program data. Students are
  bound to the edition they entered under; a plan stores its
  `catalog_year`. Editions accumulate (`editions/2025-26/`, `2026-27/`, …)
  and the DB holds one `programs` row per (slug, edition).
- **Term code** (`2268` = Fall 2026) is the key for offerings. Terms are
  *non-final* (still changing) until their grading period ends, then frozen.
- **Courses** are kept for the current edition only (prereqs as of the
  current catalog are what a planner needs); older editions are in git
  history.
- Every committed source is described in `ledger.json`; `refresh status`
  derives what is due from it. See `docs/REFRESH.md`.

## Hot path: the stages

| Package | Fetch | Output (committed) | Notes |
|---|---|---|---|
| `catalog_courses` | ~89 dept pages | `courses/<SUBJ>.json` | prereq prose → CNF groups by a deterministic parser; ambiguous prose is reported, resolved by warm overrides pinned to the text hash |
| `pisa_offerings` | paginated POSTs per term | `offerings/<term>.jsonl` | union of snapshots, newest per term; 5-year window |
| `soe_schedule` | 10 dept pages | `soe/<year>.jsonl` | planned sections with instructors |
| `major_requirements` | index + ~121 program pages per edition | `editions/<ed>/sources/<slug>.md` + `programs.json` | normalized Markdown of the whole page; `source_sha256` (text) and `skeleton_sha256` (headings + course rows only) |

Fail-fast contract: each stage asserts its expectations about the page
(`common.guards.expect`). Any violation aborts before anything is published;
the staging dir is discarded; committed data and the DB are untouched.

## Warm path: harnesses

A **harness** is everything the app knows about one program in one
edition. The contract every requirement-tracking approach honors:

```
harnesses/ucsc/<edition>/<slug>/
  manifest.json   {"program", "edition", "approach", "source_sha256",
                   "skeleton_sha256", "status": "draft"|"verified",
                   "authored_at", "verified_at", "notes"}
  …approach-specific files (see docs/HARNESSES.md)
```

- `source_sha256` pins the harness to the exact committed source text it
  was authored and verified against. `refresh status` compares it with the
  ledger and reports stale harnesses (structure vs wording).
- A harness takes the student's plan content (courses by term, catalog
  year, declared `choices`, `attested` conditions, optional `grades`) plus
  catalog facts, and produces a progress report the UI renders.
- `eval/` scores any approach against golden cases through an adapter
  (`eval/README.md`).

**This repo's approach (C, "harness as code")** — details and the API in
`docs/HARNESSES.md`:

- A harness is a TypeScript module (`harness.ts`, plus `harness.test.ts`,
  optional bespoke `View.tsx`) written by the frontier agent straight from
  the source text, on a small standard library (`frontend/src/harness/`,
  imported as `@harness`): course sets, grade policies, an exclusive-slot
  ALLOCATION solver (deterministic, bounded), per-term helpers, declared
  choices and attestations, and a `ProgressReport` whose every node carries
  a verbatim source quote. Code may bypass the library for once-only rules.
- Evaluation is **client-side**: the browser loads the harness for the
  plan's (edition, slug) through a Vite-globbed registry, fetches catalog
  facts once (`GET /u/{univ}/catalog/compact`), and re-evaluates on every
  edit. The same modules run under node for tests, lint and eval.
- Review gates: `harness.test.ts` (vitest), `npm run typecheck`,
  `npm run harness:lint` (quotes verbatim in the source, codes in the
  catalog, every source course row referenced, manifest hashes current,
  authoring pitfalls), `eval/adapters/c-code.sh`.
- Coverage: every program in every committed edition has a harness; one
  that doesn't (a new program before its warm task is done) renders an
  explicit "not modelled yet" card, never a guessed checklist.
- Manifests may pin OTHER programs' pages a harness relies on
  (`depends_on`), so a change there also makes the harness stale.

Why harness-as-code (and not one generic rule schema): four approaches were
built and scored head to head before the rollout — the old generic JSON, a
typed declarative IR with a generic solver, this approach, and a "literate
catalog" (annotations on the page text). See the revamp report for the
comparison; the short version: every major has once-only caveats, code
expresses them without a schema cliff, and lint + tests + adversarial
review keep the code honest.

## Cold path: backend and frontend

- `backend/app/loaders/ucsc.py` — loads everything from `data-committed/`
  in one transaction; id-preserving upserts keep saved plans valid; derives
  prereq edges, availability, instructor predictions, dormant flags.
- `backend/app/planner.py` — plan validation: unknown/duplicate courses,
  missing prereqs (same quarter only where the catalog allows concurrent
  enrollment), strict co-requisites, never-offered-that-season /
  dormant warnings, GE progress, program progress.
- `backend/app/api/` — catalog (courses, graph, programs per edition,
  program source text), plans (validate is public; CRUD needs a token),
  auth, transcript.
- `frontend/src/harness/` + `frontend/src/components/degree/` — harness
  library, registry, and the degree dashboards (default + bespoke Views).
- `frontend/src/store.tsx` — plans live in localStorage
  (`prereqs.plans.v2`), synced per plan to the server when signed in; plan
  content is identical in both places.

## Data classes and backup

| Class | Home | Backup / rollback |
|---|---|---|
| user data | Postgres user tables | `ops/backup/backup.sh` (pg_dump) |
| served data | `data-committed/`, `harnesses/` (git) | git; reload |
| fetch cache | `data/` | none needed |
