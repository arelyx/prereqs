# Agent standing orders — prereqs

UCSC academic planner: FastAPI + Postgres + React. Read `docs/ARCHITECTURE.md`
(hot / warm / cold paths) first. Refreshing data: follow `docs/REFRESH.md`.
Program requirement harnesses: follow `docs/HARNESSES.md`.

## Invariants

1. `data-committed/` is written only by hot-path exporters; `git diff
   data-committed/` is the data review step.
2. `harnesses/` is written only by warm-path agents. Every harness node quotes
   the committed source verbatim; `npm run harness:lint` must pass, and a
   manifest is `verified` only after a line-by-line re-read of the source.
3. Harness code is pure (no network/DOM/clock/randomness) and never
   confidently wrong: unknowable ⇒ `cannot-check`, not `met`.
4. No LLM at request time except transcript import.
5. Back up before any production load (`ops/backup/backup.sh`).

## Repo map

| Path | What |
|---|---|
| `pipelines/` | hot path: fetch → parse → export to `data-committed/`; `python -m ucsc.refresh status` |
| `data-committed/ucsc/` | canonical served data: courses, offerings, SOE, `editions/<ed>/{programs.json,sources/*.md}`, ledger |
| `harnesses/ucsc/<ed>/<slug>/` | warm path: `harness.ts`, `harness.test.ts`, `manifest.json`, optional `View.tsx` |
| `frontend/src/harness/` | harness standard library (`@harness`), browser registry, catalog client |
| `frontend/src/components/degree/` | degree dashboards (default renderer + building blocks for Views) |
| `frontend/harness-tools/` | lint, manifest writer, edition porting, profiler, node catalog, test helpers |
| `frontend/` (rest) | planner, prereq graph, course drawer, auth, export, transcript import; e2e in `frontend/e2e/` |
| `backend/` | FastAPI API (incl. `GET /u/{univ}/catalog/compact`), loader, planner engine, auth |
| `eval/` | golden cases + scoring; adapters `legacy_json.py` (approach A) and `c-code.sh` (this approach) |
| `docs/` | ARCHITECTURE, REFRESH, HARNESSES, DATA_MODEL, OPERATIONS, research |

## Commands

```bash
cd frontend
npx vitest run                 # harness tests (npm run test:harness)
npm run harness:lint           # all harnesses (or -- <ed>/<slug>)
npm run typecheck              # app + harnesses + tooling
PW_BASE_URL=… PW_API_URL=… npx playwright test   # e2e against a running stack
cd .. && python eval/run.py --adapter eval/adapters/c-code.sh
```
