# Agent standing orders — prereqs

UCSC academic planner: students lay out courses quarter by quarter and see
prerequisite problems, offering history, GE progress, and progress toward
their majors/minors. FastAPI + Postgres + React. All served data comes from
a git-committed dataset; the database is a disposable projection of it.
(`CLAUDE.md` is a symlink to this file — edit AGENTS.md, never write through
the link.)

**Refreshing data? Start with `python -m ucsc.refresh status --probe`
(from `pipelines/`) and follow `docs/REFRESH.md`.** Do not improvise the
sequence or hand-pick which terms/programs to update.

## The three paths (read docs/ARCHITECTURE.md before changing anything)

| Path | What | Who runs it | Changes when |
|---|---|---|---|
| **HOT** | Deterministic fetch → committed data: course catalog + prereqs, pisa offerings, SOE plan, program page *source texts*, the ledger | `python -m ucsc.refresh hot` — no AI | every refresh |
| **WARM** | Frontier-agent work: program harnesses (`harnesses/`), prereq overrides for prose the parser can't decide | a Claude Code agent following docs/REFRESH.md §4 and docs/HARNESSES.md | when the hot path reports a change set |
| **COLD** | Structure: backend engine/API/loader, frontend shell, pipeline framework, eval harness | deliberate engineering only | never as a side effect of a data refresh |

A refresh that needs a COLD change (a parser fix after an abort, a new
harness primitive) is fine — but make it a separate, explained commit.

## Invariants — each one has broken things before

1. **`PIPELINE ABORTED` is a feature.** An upstream page changed shape; the
   run discarded its staging dir and nothing was corrupted. Read the named
   expectation, fix the parser, re-run. Never loosen a guard to make an abort
   go away, and never retry-loop past one.
2. **`git diff data-committed/ harnesses/` IS the review step.** Read it
   before loading; commit it with the code that produced it.
3. **Never hand-edit hot-path output** (`data-committed/ucsc/{courses,
   offerings,soe,editions,ledger.json}`): the next refresh overwrites it.
   Corrections go in the warm layer (prereq overrides, harnesses) or in the
   pipeline code.
4. **A harness is pinned to the source text it was written against**
   (`manifest.json: source_sha256`). If the source changed, the harness is
   stale until re-verified — `refresh status` lists them. Never just bump
   the hash.
5. **Programs are per catalog edition.** Students are bound to the edition
   they entered under. A new edition is ADDED (`editions/<new>/`); old ones
   are kept and re-fetched once from the archive URL. Never overwrite an
   older edition's sources with the current page.
6. **pisa ranges go through the chunked driver**
   (`ucsc.pisa_offerings.backfill`) — upstream 504s under sustained load.
   Polite spacing stays as configured.
7. **Canonical JSON dump** for committed files:
   `json.dumps(obj, indent=1, ensure_ascii=False, sort_keys=True) + "\n"`
   (`ucsc.ledger.dump`). Agents have mangled Unicode before.
8. **The local LLM is for transcript import only** (llama-server,
   `qwen3.8-27b`, `--parallel 1`, one request in flight via the backend's
   lock). No pipeline and no requirement check uses an LLM.
9. **Golden eval cases are written from the source text only**, never from a
   harness. A held-out split lives outside the repo; don't go looking.
   A perfect golden score is not proof — also probe harnesses adversarially.
10. **Back up before a production load** (`ops/backup/backup.sh`).

## Environment (non-default ports — this host runs other projects)

- Postgres `localhost:5433`, backend `:8200`, frontend `:5273`; llama-server `:8080`
- `DATABASE_URL=postgresql+psycopg://prereqs:prereqs@localhost:5433/prereqs`
- Venvs: `pipelines/.venv`, `backend/.venv`. Pipelines run from `pipelines/`
  as `python -m ucsc.<pkg>.<stage>`; the loader is
  `backend/.venv/bin/python -m app.loaders.ucsc [--only ...]`.
- `docker compose up -d` brings up db + backend + frontend.

## Repo map

| Path | Path class | What |
|---|---|---|
| `pipelines/ucsc/refresh.py` | hot | entry point: status / work order / run hot tasks |
| `pipelines/ucsc/{ledger,editions}.py` | hot | the temporal ledger; catalog-edition helpers |
| `pipelines/ucsc/catalog_courses/` | hot (+warm overrides) | catalog fetch, parse, deterministic prereq parser, `prereq_overrides.json` |
| `pipelines/ucsc/pisa_offerings/` | hot | per-term class search → `offerings/<term>.jsonl` |
| `pipelines/ucsc/soe_schedule/` | hot | Baskin planned schedule → `soe/<year>.jsonl` |
| `pipelines/ucsc/major_requirements/` | hot | program pages per edition → `editions/<ed>/sources/*.md`; legacy generic-JSON structurer |
| `pipelines/common/` | cold | http, guards (`expect`), snapshot cache |
| `data/` | — | gitignored fetch cache (raw HTML + snapshots) |
| `data-committed/ucsc/` | hot output | canonical served data + `ledger.json` |
| `harnesses/ucsc/<ed>/<slug>/` | warm output | per-program requirement harnesses |
| `eval/` | cold | golden cases (dev split), runner, adapters |
| `backend/` | cold | FastAPI API, loader, planner engine, transcript import |
| `frontend/` | cold | React app |
| `docs/` | — | ARCHITECTURE, REFRESH (temporal runbook), HARNESSES, DATA_MODEL, OPERATIONS, per-source research |

## Verification bar for any change

`pipelines: .venv/bin/python -m pytest` · `backend: .venv/bin/python -m pytest`
· `frontend: npx tsc -b && npx playwright test` (needs the loaded stack) ·
`eval: python eval/run.py --adapter ...` for harness changes — plus a
screenshot check for UI work. Report failures honestly; never ship on a red
suite, and never mask exit codes by piping into `tail` before checking.
