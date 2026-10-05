# Refreshing the data — the temporal runbook

This is the procedure an agent follows every time it is woken up to bring
the site up to date — whether two weeks or a year have passed. It is
written so that the agent never has to decide *what* to update from memory:
the ledger says what we have, the cadence rules say what is due, and the
change set says what the warm path must touch.

```
cd pipelines
.venv/bin/python -m ucsc.refresh status --probe     # 1. what's due (≈13 requests)
.venv/bin/python -m ucsc.refresh hot --probe        # 2. run every HOT task
git diff --stat data-committed/                     # 3. review the change set
.venv/bin/python -m ucsc.refresh status             # 4. remaining WARM tasks
#    … do the warm tasks (§Warm), run eval, commit …
cd ../backend && .venv/bin/python -m app.loaders.ucsc   # 5. load (after backup in prod)
```

## 1. What changes, where, and when

| Source | URL | Changes | Cadence rule (`ucsc/refresh.py`) | Lands in |
|---|---|---|---|---|
| pisa class search | `pisa.ucsc.edu/class_search/` | a new quarter's schedule appears in the term dropdown ~5–7 weeks before it starts; enrollment and instructor assignments keep moving until the grading period ends | fetch every term newer than the ledger's newest; re-fetch every **non-final** term on each refresh; a term is final (frozen) after its grading period (`terms.is_final`) | `data-committed/ucsc/offerings/<term>.jsonl` |
| Baskin (SOE) planned schedule | `courses.engineering.ucsc.edu/courses/<dept>` | next academic year's plan, with instructors, published roughly a year ahead and revised in place | re-fetch if older than 30 days | `data-committed/ucsc/soe/<academic-year>.jsonl` |
| Catalog course descriptions | `catalog.ucsc.edu/en/current/general-catalog/courses` | one edition per academic year (rolls ~July for the fall); occasional mid-year corrections | re-fetch on a new edition label or if older than 90 days | `data-committed/ucsc/courses/<SUBJ>.json` |
| Program (major/minor) pages | `catalog.ucsc.edu/en/current/general-catalog/academic-programs/...` | same yearly edition; past editions archived at `/en/YYYY-YYYY/...` | new edition → fetch + export sources; the previous edition is re-fetched **once** from its archive URL | `data-committed/ucsc/editions/<ed>/{programs.json,sources/*.md}` |

Expected calendar (observed, verify with `--probe` — never assume):

| When | Event | What the refresh does |
|---|---|---|
| late Oct / early Nov | Winter schedule on pisa | new term fetched |
| ~Feb | Spring schedule; Summer often soon after | new terms fetched |
| ~Apr–May | Fall schedule for the next year; SOE plan for next year | new term; SOE file for the new academic year |
| ~early July | New catalog edition goes live at `/en/current/` | courses refetched; new `editions/<ed>/`; previous edition refetched from archive; **every harness for the new edition is a warm task** |
| any time | Catalog/SOE corrections | caught by the age rules; usually small text-only diffs |

The edition is detected from the "YYYY-YYYY UCSC General Catalog" label
on the page, never from the date. Pisa's newest term is read from its
dropdown, never computed.

## 2. The ledger

`data-committed/ucsc/ledger.json` (written only by exporters) records, per
source, what the committed data was built from and when:

```json
{
 "catalog_courses": {"edition": "2026-27", "fetched_at": "...", "courses": 6172, ...},
 "editions": {"2026-27": {"fetched_at": "...", "live": true,
              "programs": {"music-bm": {"text": "<sha256>", "skeleton": "<sha256>"}}}},
 "pisa_offerings": {"window_years": 5, "terms": {"2268": {"fetched_at": "...", "rows": 1612, "final": false}}},
 "soe_schedule": {"academic_year": "2026-27", "fetched_at": "...", "rows": 698, ...}
}
```

`refresh status` reads it, applies the cadence rules, optionally probes the
live sites, and prints a work order. `--json` gives the same thing machine
readable.

## 3. HOT tasks — just run them

`refresh hot` runs the hot commands in order and stops at the first
failure. Every hot stage is deterministic and idempotent: re-running an
unchanged source rewrites byte-identical files.

- **An abort** (`PIPELINE ABORTED: <expectation>`) means the upstream page
  changed shape. Fix the parser (a cold change, separate commit), re-run.
  The research docs in `docs/universities/ucsc/` describe each page's shape.
- **pisa 504s** — the driver retries and rests; if one term keeps failing,
  note it and move on (a term can simply be broken upstream; 2072 was).
- **Window**: offerings keep 5 academic years (`--window-years`); older
  terms drop out of the committed set. Dormant flags derive from that window.

Then read `git diff --stat data-committed/`:

- offerings: new term files + changed non-final terms — expected.
- courses: a new edition changes many files; mid-year, expect a handful.
- editions: the export prints `ADDED / REMOVED / CHANGED-STRUCTURE /
  CHANGED-TEXT` slugs. That list is the warm path's input.

## 4. WARM tasks — frontier-agent work

`refresh status` lists them after the hot run. Kinds:

| Warm task | Means | Do |
|---|---|---|
| `harness: STRUCTURE changed` | course lists or rule groups moved on the program page | re-author the harness against the new source (approach-specific guide: `docs/HARNESSES.md`), re-run its tests + `eval/`, update `manifest.json` (`source_sha256`, `skeleton_sha256`, `status`) |
| `harness: wording changed` | same skeleton, different text | read `git diff` of the source; if only policy/outcomes prose changed, re-verify and update the hashes; if a rule's wording changed ("four" → "five"), treat as structural |
| `harness: no harness yet` | new program or new edition | author one |
| `prereqs: ambiguous` | the deterministic prereq parser could not decide | read the raw text, write an override in `pipelines/ucsc/catalog_courses/prereq_overrides.json` (pinned to the text's hash) |

A new edition makes **every** program a warm task for that edition, but the
previous edition's harness is the starting point: diff
`editions/<old>/sources/<slug>.md` against `editions/<new>/sources/<slug>.md`
and port the changes (last roll: 95 of 119 programs changed structure, 24
only wording).

Golden cases (`eval/golden/`) are per edition. When a program's source
changes structurally, re-check its golden cases against the new source (they
are written from the source only — never from the harness) before trusting
the eval numbers.

## 5. Commit, load, verify

1. One commit (or one per concern): hot data + warm changes + any cold fixes,
   with the change set summarized in the message.
2. `ops/backup/backup.sh` (production).
3. `backend/.venv/bin/python -m app.loaders.ucsc` (transactional; ids are
   preserved so saved plans stay valid).
4. Suites: pipelines, backend, frontend e2e, eval. e2e fixtures pin real
   entities (instructors, a dormant course); an edition roll can break them —
   update the fixture, never weaken the assertion.
5. Spot-check in the UI: one changed program, one unchanged, one course
   drawer showing the new term.
