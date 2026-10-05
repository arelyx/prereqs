# Operations

Day-to-day commands. Design: `ARCHITECTURE.md`. Data refresh: `REFRESH.md`.
Backup/rollback: `../ops/backup/README.md`. Agent rules: `../AGENTS.md`.

## Stack

```bash
docker compose up -d --build     # db :5433, backend :8200, frontend :5273
docker compose exec backend python -m app.loaders.ucsc     # (re)load served data
```

Native (no containers for backend/frontend):

```bash
export DATABASE_URL=postgresql+psycopg://prereqs:prereqs@localhost:5433/prereqs
cd backend && .venv/bin/alembic upgrade head && .venv/bin/python -m app.loaders.ucsc
.venv/bin/uvicorn app.main:app --port 8200 --reload
cd frontend && VITE_API_URL=http://localhost:8200 npm run dev -- --port 5273
```

The loader reads only `data-committed/` (plus `harnesses/`), in one
transaction: `--only courses|offerings|programs|availability` loads one part.

## Transcript import (backend env)

Needs an OpenAI-compatible LLM server; without one the feature refuses
cleanly (503, UI disabled). Settings (`backend/app/config.py`):

- `LLM_URL` — default `http://localhost:8080` (llama-server). Dev compose
  points it at the host via `host.docker.internal:8080`.
- `TRANSCRIPT_LLM_MODEL` — default `qwen3.8-27b` (must be in `/v1/models`).
- `TRANSCRIPT_LLM_TIMEOUT` / `TRANSCRIPT_BUDGET_SECONDS` /
  `TRANSCRIPT_MAX_BYTES` — per-call timeout, whole-request ceiling, upload cap.

Measured on the dev host: an 18-quarter transcript parses in ~2 minutes
(one call per quarter, serialized).

## Rolling back served data

```bash
git checkout <good-rev> -- data-committed harnesses
cd backend && .venv/bin/python -m app.loaders.ucsc
```

## Tests

```bash
cd pipelines && .venv/bin/python -m pytest
cd backend && .venv/bin/python -m pytest       # SQLite, no services
cd frontend && npx tsc -b && npx playwright test   # needs the running, loaded stack
python eval/run.py --adapter "<cmd>"           # harness accuracy (eval/README.md)
```
