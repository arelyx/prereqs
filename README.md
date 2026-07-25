# prereqs — Academic Planner

A full-stack academic planner that unifies scattered, unstructured university data (course catalogs, degree requirements, historical schedules) into a single tool where students can visualize prerequisites, track major/GE requirements, and plan their schedule quarter by quarter.

University data is ingested by **LLM pipelines**: deterministic scrapers pull raw pages, a small local model (qwen3:4b via Ollama) structures the messy parts (prerequisite logic, requirement rules) under strict schema guards, and everything is snapshotted for auditability and rollback. Pipelines are **fail-fast**: if an upstream page changes shape, the pipeline halts without touching served data.

**Supported universities:** UC Santa Cruz (full support — 6,172 courses, 22 years of offering history, 75 majors + 44 minors with structured requirements, 7 majors hand-verified). UC Davis / UC San Diego (research + prototype pipelines, not integrated).

**Status:** end-to-end working. `docker compose up` + loaded snapshots gives you: course search and detail with prerequisite structure and a React Flow prereq/unlocks graph, quarter-by-quarter planning with live validation (missing prereqs, never-offered-that-quarter warnings, GE progress, major requirement progress), instructor predictions from 22 years of history + the SOE's planned schedule, and optional accounts that sync the anonymous localStorage plan. Verified by a 6-test Playwright e2e suite against the full dataset.

## Architecture

```
├── backend/     FastAPI + SQLAlchemy + Postgres. Token auth, planner API, prereq graphs.
├── frontend/    React + Vite. Dashboard: quarter planner, prereq visualizer, requirement progress.
├── pipelines/   Python scraping + LLM structuring, one module per university per source.
│   ├── common/  Ollama harness, schema guards, snapshot store, fail-fast primitives.
│   └── ucsc/    catalog courses, pisa offerings history, SOE schedule, major requirements.
├── ops/         Backup / rollback tooling (user data, raw scrapes, structured data).
└── docs/        Architecture, data model, per-university source quirks & hazards.
```

See `docs/ARCHITECTURE.md` for the full design and `docs/universities/ucsc/` for source-specific documentation.

## Quick start

```bash
docker compose up --build
# frontend: http://localhost:5273   backend: http://localhost:8200/docs
# (non-default ports: this dev host runs other projects on 5173/8000/5432)
```

The app is usable without an account (plans persist in localStorage); creating an account syncs plans to the server.

## Development

Pipelines run on the host (they need a local Ollama with `qwen3:4b`):

```bash
cd pipelines
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
python -m ucsc.catalog_courses.fetch          # raw snapshots
python -m ucsc.catalog_courses.structure      # LLM structuring
python -m ucsc.load --into postgres           # load verified snapshot into the DB
```

Every pipeline run writes a versioned snapshot under `data/` (gitignored) with provenance metadata; the serving database is only updated from a snapshot that passed all guards. `ops/backup` can snapshot and restore the full application state (user data + scraped + structured data).
