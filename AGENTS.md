# Agent standing orders — prereqs

Academic planner for UCSC students. FastAPI + Postgres + React, data produced
by scraping pipelines with a **Local LLM** (Ollama qwen3:4b) structuring
stage, reviewed and served from a git-committed dataset. You are expected to
work autonomously but leave a full audit trail: branch → PR → merge for every
change, including data refreshes.

**Doing the annual catalog refresh? Follow `docs/runbooks/ANNUAL_REFRESH.md`
step by step. Do not improvise the sequence.**

## Invariants — violating any of these has broken production before

1. **LLM pipelines run serially, never concurrently.** Two different system
   prompts alternating against one Ollama instance thrash the KV prefix cache
   (~15x throughput collapse, measured). One LLM stage at a time, ever.
2. **`PIPELINE ABORTED` is a feature, not a bug.** It means an upstream page
   changed shape; staging was discarded and nothing was corrupted. Read the
   named expectation, fix the parser, re-run. Never loosen a guard to make an
   abort go away, and never retry-loop past one.
3. **Never `--force` over `origin: hand-edited` files** in `data-committed/`
   (80 of 119 program files carry manual corrections). The exporter refuses
   for a reason. The merge protocol is in the annual-refresh runbook, Phase 5.
4. **`git diff data-committed/` IS the data review step.** Committed data is
   canonical; the DB is a projection of it. Review the diff before loading,
   commit it with the code that produced it.
5. **A program whose content changed loses `frontier-verified` status** (the
   exporter resets it). Changed programs must be re-verified per
   `docs/universities/ucsc/VERIFY_METHOD.md` before the load ships.
6. **pisa backfills must use the chunked driver** (`ucsc.pisa_offerings.backfill`),
   never a monolithic range fetch — the upstream 504s under sustained load.
7. **Always `ensure_ascii=False`** when writing committed JSON (canonical dump:
   `json.dumps(obj, indent=1, ensure_ascii=False, sort_keys=True) + "\n"`).
   Agents have mangled Unicode in 12 files before.
8. **Back up before any load** (`ops/backup/backup.sh`). Rollback paths:
   committed data = git; snapshots = `--courses/--offerings/--soe <older-dir>`
   loader flags; user data = `restore.sh <dir> userdata`.

## Environment (non-default ports — this host runs other projects)

- Postgres `localhost:5433`, backend `:8200`, frontend `:5273`
- `DATABASE_URL=postgresql+psycopg://prereqs:prereqs@localhost:5433/prereqs`
- Venvs: `pipelines/.venv`, `backend/.venv`; pipelines run from `pipelines/`
  as `python -m ucsc.<source>.<stage>`; loader is
  `backend/.venv/bin/python -m app.loaders.ucsc` (accepts `--only`)

## Repo map

| Path | What |
|---|---|
| `pipelines/ucsc/` | scrape + structure: `catalog_courses`, `major_requirements`, `pisa_offerings`, `soe_schedule`, `export_committed.py` |
| `pipelines/common/guards.py` | `expect()` fail-fast machinery every pipeline uses |
| `data/` (gitignored) | immutable timestamped snapshots + manifests |
| `data-committed/ucsc/` | canonical courses + programs, one entity per file |
| `backend/app/loaders/` | id-preserving upserts; availability/dormant derivation |
| `docs/OPERATIONS.md` | day-to-day commands; `docs/runbooks/` — multi-phase procedures |
| `docs/universities/ucsc/` | per-source quirk research, VERIFY_METHOD.md, VERIFICATION.md campaign log |

## Verification bar for any change

`backend: .venv/bin/python -m pytest` · `pipelines: python -m pytest` ·
`frontend: npx playwright test` (needs the loaded stack) — plus a headless
screenshot check for UI work. Report failures honestly; never ship on a red
suite, and never mask exit codes by chaining `| tail` before checking.
