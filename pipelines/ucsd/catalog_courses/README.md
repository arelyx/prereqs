# ucsd / catalog_courses — PROTOTYPE, not integrated

Prototype fetch stage only: two subject pages (CSE, MATH), deterministic parse,
snapshot, counts. Research, field inventory, quirks, and the differences-vs-UCSC
analysis: `docs/universities/ucsd/source-catalog.md`.

```bash
python -m ucsd.catalog_courses.fetch         # 2 requests, throttled 1.5s
```

Live run 2026-07-25: CSE 212 + MATH 224 = 436 courses; 396 with prereq prose;
4 slash-cross-listed; 7 `A-B-C` sequence entries; nonstandard subhead
`Teaching of Mathematics` surfaced in the manifest.

The unparseable-name hard-fail earned its keep on the very first live run:
it caught `Tags:` (plural) annotations (CSE 127) and `(1 to 4)` units
(MATH 295) that the initial grammar missed — both are now handled and
documented. Known limitations: sequence entries (`MATH 220A-B-C`) are flagged,
not exploded into per-course rows; no subject discovery; no LLM structuring.
