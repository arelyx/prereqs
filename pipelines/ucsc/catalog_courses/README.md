# ucsc / catalog_courses

Course catalog pipeline: `fetch` (scrape + deterministic parse) → `structure`
(qwen3:4b prereq structuring). Source research, field inventory, and hazard
catalog: `docs/universities/ucsc/source-catalog-courses.md`.

```bash
python -m ucsc.catalog_courses.fetch                 # ~89 requests, throttled
python -m ucsc.catalog_courses.structure             # ~1,800 LLM calls, ~30 min on GPU
python -m ucsc.catalog_courses.structure --resume data/.../<ts>.staging  # continue an aborted run
```

## Quirks & hazards encountered (keep updated — audit runs rely on this)

- **The POC silently dropped GE codes, quarter-offered, instructor, and inline
  cross-listings** by walking only `div` siblings. We walk all sibling tags and
  hard-fail on any block-level class not in `parse.KNOWN_BLOCK_CLASSES` —
  unknown classes are exactly how fields get lost silently.
- **Cross-listed tail double-counting:** each dept page ends with a
  `div.cross-listed` section containing full duplicate course blocks managed by
  other departments (CSE has 8, e.g. ECE 253). Parsed pages exclude them;
  the manifest records them per dept.
- **sc-courselink double-text hazard:** requirements prose wraps each course
  mention in an anchor; a descendants-based text walk emits every code twice
  ("CSE 12 CSE 12 or ..."), which would poison the LLM input. `_parse_extra_fields`
  walks direct children only (regression-tested).
- **Unstaffed instructor fields** render as comma/space runs (`",   ,   ,"`) —
  normalized to null.
- **Departments churn on edition rolls** (CLST 404s in 2026-27; HTEC added).
  Removal of ≤5 depts vs the previous snapshot is reported, more aborts.
  Per-dept course counts are guarded at ±15% vs the previous snapshot.
- **`Quarter offered` is present on <1% of courses** — the catalog is not a
  schedule; availability comes from pisa_offerings / soe_schedule.
- **Duplicate-code guard** across departments (each course must be unique
  campus-wide after tail exclusion).
- **Structure-stage quarantine:** a course whose model output fails to parse
  gets `prereq_groups: null` (unknown), never a guess; >5% failures aborts.
  Emitted codes are guarded verbatim-against-source (rule 11), killing
  hallucinated/few-shot-regurgitated codes; codes not in the current catalog
  are kept but listed in the manifest (`unresolved_prereq_codes`).
- **LLM throughput:** ~8 calls/min cold; the needs_llm prefilter maps ~60% of
  requirement blobs to `[]` without a call (no course-code token present).

## Prompt versioning

`prompts.PROMPT_VERSION` (currently `prereq_v1`, inherited from the POC where
it was tuned against a Gemini baseline). Any prompt edit must bump the version;
manifests record it, so two snapshots are comparable only at equal versions.
