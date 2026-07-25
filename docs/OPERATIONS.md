# Operations

Day-to-day runbook. Architecture rationale: `ARCHITECTURE.md`. Per-source
research: `universities/`. Backup/rollback detail: `../ops/backup/README.md`.

## Stack

```bash
docker compose up -d --build     # db :5433, backend :8200, frontend :5273
```

## Refreshing UCSC data

All pipelines run on the host from `pipelines/` (venv + local Ollama):

```bash
cd pipelines && source .venv/bin/activate

# 1. Catalog courses (~89 requests, ~2 min; then ~1,800 LLM calls, ~30-45 min)
python -m ucsc.catalog_courses.fetch
python -m ucsc.catalog_courses.structure            # resumable: --resume <staging>

# 2. Offerings history — product scope is ~5 years (chunked driver; skips
#    terms already covered by finalized snapshots)
python -m ucsc.pisa_offerings.backfill --from 2218 --to 2268
python -m ucsc.pisa_offerings.run --terms 2270      # typical incremental run

# 3. SOE planned schedule (10 requests)
python -m ucsc.soe_schedule.run

# 4. Major requirements (~121 requests + a few dozen LLM fallback calls)
python -m ucsc.major_requirements.fetch
python -m ucsc.major_requirements.run               # --no-llm for a dry pass

# 5. Load into Postgres (transactional per source; also derives availability
#    + instructor predictions)
cd ../backend && DATABASE_URL=postgresql+psycopg://prereqs:prereqs@localhost:5433/prereqs \
  .venv/bin/python -m app.loaders.ucsc
```

### Hard constraints learned in production

- **Run LLM pipelines serially, never concurrently.** Two pipelines with
  different system prompts alternating against one Ollama instance thrash the
  KV prefix cache — throughput drops ~15x (measured: 60/min → 4/min on the
  GTX 1650). The catalog structure stage and the majors run stage must not
  overlap.
- **pisa backfills stress the upstream server.** Historical all-subject pages
  are ~5-7 MB and the server 504s under sustained load; the pipeline uses a
  120s timeout, 5 retries, a 90s per-term cooldown retry, and ≥4s spacing.
  Prefer incremental single-term runs over repeated full backfills.
- **A pipeline abort is a feature.** `PIPELINE ABORTED` means an upstream page
  no longer matches expectations; staging is discarded, the DB and previous
  snapshots are untouched. Read the message, fix the pipeline (the message
  names the exact violated expectation), re-run. Two real examples both
  occurred on first full runs and took minutes to fix: HAVC's
  `courseListHeader` block, CMS duplicate course blocks (MATH 24).

## When a load goes wrong

`pipeline_runs` records the exact snapshot dir every source was loaded from.
Rollback = re-run the loader pointing at the previous snapshot:

```bash
.venv/bin/python -m app.loaders.ucsc --courses ../data/ucsc/catalog_courses_structured/<older-ts>
```

## Verification

```bash
cd pipelines && python -m pytest          # pipeline unit tests
cd backend && .venv/bin/python -m pytest  # API tests (SQLite, no services)
cd frontend && npx playwright test        # e2e vs the running stack + loaded data
```
