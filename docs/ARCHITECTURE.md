# Architecture

## Problem shape

University data is scattered (catalog, class search, department pages), unstructured (prose prerequisites, per-major requirement pages with exceptions), and unstable (pages change without notice). The application therefore separates three layers with hard boundaries:

1. **Acquisition (pipelines/)** — deterministic scrapers fetch raw pages and write immutable, timestamped snapshots. A small local LLM (qwen3:4b via Ollama) structures only the parts that genuinely need interpretation (prerequisite prose, requirement rules), under strict JSON-schema guards with automatic retry and hard failure.
2. **Storage (Postgres)** — the serving database. Loaded *only* from a structured snapshot that passed every guard. Pipeline runs are recorded with provenance (`pipeline_runs` table: source, snapshot id, git sha, model, pass/fail).
3. **Serving (backend/ + frontend/)** — reads the database; never touches the network or the LLM at request time.

## Fail-fast contract

Scrapers assert their expectations about page structure (selector hit counts, required fields, plausible totals vs. the previous snapshot). Any violation **aborts the run before the database is touched**. The previous snapshot and the serving DB remain intact. Failures are for a human/frontier-LLM audit, not for silent recovery — a page-shape change usually means the university changed something semantically (new major, new requirement) that needs review, not a retry.

LLM outputs are similarly guarded: schema validation, cross-reference checks (every referenced course id must exist in the scraped catalog), and plausibility checks (unit counts, group sizes). A course/major that fails guards is quarantined and reported; a failure rate above threshold aborts the run.

## Multi-university isolation

Each university is a self-contained pipeline package (`pipelines/<univ>/`) that must produce the same *normalized* output schema (courses, offerings, programs, requirements — see `DATA_MODEL.md`). University quirks (quarter vs semester, stale course listings, missing prereqs) are handled and documented inside the university package; nothing university-specific leaks into the backend or frontend, which only speak the normalized schema. The `universities` table scopes every data row; users pick one university.

## Backup / rollback

Data classes by dynamism, each with its own home and restore path:

- **User data** (accounts, plans) — truly dynamic; Postgres, `pg_dump` via `ops/backup`. The only class the backup strategy must carry.
- **Committed catalog data** (courses, prerequisite structures, program requirements) — near-static and trust-sensitive; lives IN THE REPO at `data-committed/<univ>/`, one entity per file with stable ordering. The Local-LLM pipeline proposes changes by writing here; `git diff` is the review artifact a human and/or the Frontier LLM approves. `origin`/`verification` blocks record hand edits and frontier verification; the exporter never silently clobbers either. Rollback = git.
- **Raw scrapes + offerings** — regenerable, deterministic, bulky; immutable snapshot dirs `data/<univ>/<source>/<timestamp>/` (gitignored) with provenance manifests. Rollback = point the loader at an older snapshot.

The DB loader is idempotent and transactional per university: loading an old snapshot restores served data without touching user data.

## LLM roles

- **Frontier LLM (build/audit time)**: writes and refines this code; when a pipeline aborts, analyzes the diff between page and expectations and adapts the pipeline.
- **Small LLM (run time, qwen3:4b)**: narrow, schema-constrained structuring tasks only. Never free-form. Prompts live next to their pipeline with versioned prompt ids so output snapshots record exactly which prompt produced them.

## Transcript import

The one deliberate exception to "serving never touches the LLM at request
time": `POST /u/{univ}/transcript/parse` turns an uploaded transcript PDF
into a best-guess completed-courses list that the user confirms in a review
UI. Constraints that shape it:

- **In-memory only.** The PDF and its text are PII (name, student ID); they
  are never persisted, never logged, never echoed into error messages.
  Chunking starts at the first quarter heading, so the identity header is not
  even sent to the (local) LLM.
- **LLM-gated with a refusal fallback.** The local Ollama model
  (`TRANSCRIPT_LLM_MODEL`, default qwen3:4b) is the only parser — there is no
  heuristic/regex fallback. `GET /transcript/status` reports availability; if
  Ollama is unreachable or the model missing, the backend answers 503 and the
  frontend shows the feature as unavailable. Prod has no Ollama configured,
  so the feature is off there by default.
- **Serial, chunked LLM calls.** Text is split per quarter section and parsed
  with one LLM call per chunk — strictly serialized through a module lock
  (`backend/app/llm.py`), honoring the one-in-flight-Ollama-request invariant.
  Responses are schema-validated and every extracted code must appear in the
  chunk text (anti-fabrication); one retry, then 502. Extracted codes are
  cross-checked against the catalog — only matched courses can be added.

## Plan export

Spreadsheet export (CSV and styled XLSX) is generated entirely client-side from the stored plan (`frontend/src/export.ts`, UI in `components/ExportButton.tsx`) — no backend endpoint, so an export can never fail differently from the app itself. Course titles/credits are fetched per-subject from the existing catalog API at export time and cached; if that fetch fails the file still downloads with code-only rows. The `exceljs` dependency is loaded via dynamic `import()` on first XLSX use, so it ships as a separate lazy chunk and adds nothing to the initial bundle. CSVs carry a UTF-8 BOM and CRLF line endings so Excel opens them cleanly.

## Auth

Token-based (opaque bearer tokens, hashed at rest), register/login/delete, no password recovery. Clerk planned later — auth is isolated in `backend/app/auth/` so it can be swapped. Anonymous users get full planner functionality via localStorage, including multiple plans switched from the nav bar; on signup the client imports the local plans that hold work (all of them into an empty account), and on sign-in all server plans are loaded and kept in sync per plan.
