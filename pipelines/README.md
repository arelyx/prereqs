# pipelines

Scraping + LLM structuring pipelines, one package per university. See
`docs/ARCHITECTURE.md` for the acquisition-layer contract (immutable
snapshots, fail-fast guards, LLM roles) and `docs/universities/<univ>/` for
per-source research: page shapes, quirks, hazards, and fail-fast markers.

## Layout

- `common/` — shared primitives, university-agnostic:
  - `guards.py` — `expect()` / `expect_range()` raise `ScrapeDriftError` on page-shape
    drift; `FailureBudget` quarantines per-item LLM failures but aborts the run past
    a threshold.
  - `http.py` — `PoliteSession`: throttled, retried; non-200 ⇒ drift error.
  - `snapshot.py` — write-once snapshot dirs `data/<univ>/<source>/<ts>/` with
    provenance manifests; staging + atomic rename so aborted runs leave nothing.
  - `ollama.py` — tuned qwen3:4b JSON-mode client (num_ctx=4096 for 4GB VRAM,
    think off; see module docstring for the full rationale).
  - `codes.py` — course-code normalization (`CSE 12` ⇄ `CSE12`) and the
    verbatim-presence extractor used to reject hallucinated codes.
- `ucsc/` — UC Santa Cruz (full support).
- `ucdavis/`, `ucsd/` — preliminary, not integrated.

## Running

```bash
cd pipelines
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest                # unit tests
```

Pipelines require a local Ollama with `qwen3:4b` for structuring stages only;
fetch stages are pure scraping.

## Rules for adding a pipeline

1. Fetch and structure are separate stages with separate snapshots; the
   structure stage reads a *snapshot*, never the network.
2. Every structural assumption about the upstream page is an `expect()` call.
   When one fires, the run halts, staging is discarded, and the served data is
   untouched — that is the intended behavior, not an error to be swallowed.
3. LLM prompts live in the pipeline package with a version identifier;
   manifests record model + prompt version + guard results.
4. Document every quirk you discover in the pipeline's README — future audit
   runs (LLM or human) rely on it.
