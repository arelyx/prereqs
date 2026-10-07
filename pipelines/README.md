# pipelines — the hot path

Deterministic acquisition: fetch upstream pages into a gitignored cache
(`data/`), parse them under fail-fast guards, and export canonical files to
`data-committed/`. No AI inference anywhere in this tree. Design:
`docs/ARCHITECTURE.md`; procedure: `docs/REFRESH.md`; per-source page
research: `docs/universities/ucsc/`.

## Entry point

```bash
cd pipelines
.venv/bin/python -m ucsc.refresh status --probe   # ledger + cadence + live checks → work order
.venv/bin/python -m ucsc.refresh hot --probe      # run every due hot task, stop on first failure
```

## Layout

- `common/` — university-agnostic primitives
  - `guards.py` — `expect()` / `expect_range()` raise `ScrapeDriftError` on
    page-shape drift; `FailureBudget` aborts a run past a per-item failure rate.
  - `http.py` — `PoliteSession`: throttled, retried, UTF-8 default; non-200 ⇒ drift.
  - `snapshot.py` — write-once cache dirs `data/<univ>/<source>/<ts>/` with
    manifests; staging + atomic rename so aborted runs leave nothing behind.
  - `codes.py` — course-code normalization (`CSE 12` ⇄ `CSE12`) and extraction.
- `ucsc/refresh.py` — the orchestrator (cadence rules, probes, work order).
- `ucsc/ledger.py` — `data-committed/ucsc/ledger.json` read/write + canonical dump.
- `ucsc/editions.py` — catalog edition ids, archive URLs, edition detection.
- `ucsc/catalog_courses/` — course catalog + deterministic prereq parser.
- `ucsc/pisa_offerings/` — class search per term (+ chunked `backfill`).
- `ucsc/soe_schedule/` — Baskin planned schedule.
- `ucsc/major_requirements/` — program pages per edition → committed source
  texts (`fetch`, `source_text`, `export_sources`).
- `ucsc/export_committed.py` — structured courses → `data-committed/`.

## Rules for any stage

1. Fetch and parse/export are separate; parse/export read the cache, never
   the network.
2. Every structural assumption about an upstream page is an `expect()`. When
   one fires the run halts and nothing is published — fix the parser, don't
   loosen the guard.
3. Exporters write with `ucsc.ledger.dump` (canonical JSON) or sorted JSONL,
   rewrite files only when content changed, and update their ledger block.
4. Record every quirk you discover in the package README or the research doc.

## Tests

```bash
.venv/bin/python -m pytest -q
```
