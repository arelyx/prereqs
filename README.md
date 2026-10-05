# prereqs — UCSC academic planner

Plan a UCSC degree quarter by quarter: search the catalog, see prerequisite
chains as a graph, get warned about missing prereqs and courses that are not
offered in a given quarter (22 years of pisa history + Baskin's planned
schedule, with instructor predictions), track GE progress, and see progress
toward your majors/minors under the catalog year you entered with. Works
anonymously (plans in localStorage); an optional account syncs plans.
Transcript PDF import pre-fills completed courses via a local LLM.

## How the data stays current

Three paths with hard boundaries (`docs/ARCHITECTURE.md`):

- **Hot** — deterministic scrapers refresh the course catalog, pisa
  offerings, the SOE plan and the text of every program page into
  `data-committed/` (git is the review step). `python -m ucsc.refresh status`
  says what is due.
- **Warm** — a frontier agent (Claude Code) reads changed program pages and
  updates that program's requirement *harness* in `harnesses/`, pinned to the
  page text it was written against.
- **Cold** — the app itself; changes only by design.

Refresh procedure: `docs/REFRESH.md`. Agent rules: `AGENTS.md`.

## Quick start

```bash
docker compose up -d --build          # db :5433, backend :8200, frontend :5273
docker compose exec backend python -m app.loaders.ucsc   # load data-committed/
open http://localhost:5273            # API docs: http://localhost:8200/docs
```

(Non-default ports: this dev host runs other projects on 5173/8000/5432.)

## Layout

```
pipelines/   hot path: fetch → parse → export to data-committed/ (+ refresh orchestrator)
data-committed/ucsc/   canonical served data, one entity per file, + ledger.json
harnesses/   warm path: per-program requirement harnesses, per catalog edition
eval/        golden student records + scoring for any harness approach
backend/     FastAPI + SQLAlchemy + Postgres: API, loader, planner engine
frontend/    React + Vite + Tailwind: planner, graph, program dashboards
ops/backup/  user-data backup/restore (served data is in git)
docs/        ARCHITECTURE, REFRESH, DATA_MODEL, OPERATIONS, HARNESSES, source research
```

## Development

```bash
cd pipelines && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt pytest
cd backend   && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cd frontend  && npm ci
```

Tests: `pipelines/.venv/bin/python -m pytest` (from `pipelines/`),
`backend/.venv/bin/python -m pytest` (from `backend/`),
`npx tsc -b && npx playwright test` (from `frontend/`, needs the loaded stack).
