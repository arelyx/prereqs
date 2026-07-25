# ucdavis / catalog_courses — PROTOTYPE, not integrated

Prototype fetch stage only: two subject pages (ECS, MAT), deterministic parse,
snapshot, counts. Research, field inventory, quirks, and the differences-vs-UCSC
analysis: `docs/universities/ucdavis/source-catalog.md`.

```bash
python -m ucdavis.catalog_courses.fetch      # 2 requests, throttled 1.5s
```

Live run 2026-07-25: ECS 185 + MAT 148 = 333 courses; 310 with prereq prose,
153 with GE codes; zero unknown extras labels.

Known limitations (deliberate, prototype scope): no subject discovery, no LLM
structuring, superseded-course blocks are flagged (`has_updated_version`) but
only the outdated top-level fields are extracted, and code normalization for
Davis's zero-padded numbers (`ECS 036A` vs prose `MAT108`) is undecided.
