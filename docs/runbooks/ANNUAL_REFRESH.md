# Annual catalog refresh — phase-gated runbook

Run this when a new catalog edition rolls (UCSC publishes ~July for the
fall). It re-scrapes courses + program requirements, extends the offerings
window, re-derives every relationship (prereq edges, availability, dormant
flags, requirement progress), and re-verifies changed programs — without
corrupting served data at any intermediate point.

**Ground rules** (full list in `/AGENTS.md`): one LLM pipeline at a time;
aborts are drift signals, not errors; never `--force` hand-edited files;
`git diff data-committed/` is the review artifact; changed programs must be
re-verified before load; back up first.

Each phase ends with a **GATE**. Do not start the next phase until the gate
passes. If a gate fails, fix and re-run the phase; if you cannot, stop and
report — a half-applied refresh is worse than a late one.

---

## Phase 0 — Preflight & baseline

```bash
cd ~/workspace/prereqs
git status                        # must be clean, on main, synced
docker compose up -d              # db :5433, backend :8200, frontend :5273
ops/backup/backup.sh              # pre-refresh restore point
cd pipelines && source .venv/bin/activate
ollama list | grep qwen3          # model present; nothing else using the GPU
```

Record the baseline (compare against it in Phase 8):

```bash
cd ../backend && DATABASE_URL=postgresql+psycopg://prereqs:prereqs@localhost:5433/prereqs \
.venv/bin/python - <<'EOF'
from sqlalchemy import create_engine, text; import os
e = create_engine(os.environ["DATABASE_URL"])
with e.connect() as c:
    for q in ["select count(*) from courses",
              "select count(*) from courses where dormant",
              "select count(*) from course_offerings",
              "select count(*) from programs",
              "select count(distinct term_id) from course_offerings"]:
        print(q, "->", c.execute(text(q)).scalar())
EOF
```

**GATE 0:** clean tree, services healthy, backup dir written, baseline saved
into your working notes.

## Phase 1 — Term arithmetic (decide the new window)

Term codes: `2` + `YY` + season digit (`0`=winter `2`=spring `4`=summer
`8`=fall). Example: fall 2027 = `2278`. Product scope is **~5 years of
history** plus the upcoming planned year.

- New terms to backfill: everything after the newest term already in
  `data/ucsc/pisa_offerings/` snapshots, up through the latest term pisa
  serves.
- The window *slides*: courses count as dormant only if they have zero
  offerings in the data present, so decide whether to prune snapshots older
  than ~5 years from the load (loader unions whatever dirs it is given).

**GATE 1:** you can state, in term codes: backfill range, expected new-term
count, and which old terms (if any) drop out of the window.

## Phase 2 — Offerings (deterministic; no LLM involved)

```bash
cd pipelines && source .venv/bin/activate
python -m ucsc.pisa_offerings.backfill --from <first-new> --to <last-new>
python -m ucsc.soe_schedule.run          # planned year, 10 requests
```

Known quirks: chunked driver skips terms already covered by finalized
snapshots; upstream 504s under load (the driver paces itself — don't
"optimize" it); Extension (X-prefixed) sections are filtered by design; one
historical term (2072) had a server-side pathology — out of scope now, but
precedent that *a term can simply be broken upstream*; if a term 504s
persistently, note it and move on rather than hammering.

**GATE 2:** one finalized snapshot dir per new term with plausible row counts
(a regular quarter is thousands of sections; summer is far smaller), SOE
snapshot present, zero aborts.

## Phase 3 — Catalog courses (Local LLM — serial)

```bash
python -m ucsc.catalog_courses.fetch          # ~89 requests, ~2 min
python -m ucsc.catalog_courses.structure      # ~1,800 LLM calls, 30-45 min; --resume <staging> after interrupt
```

- An abort here means the catalog site changed shape. Fix `parse.py`
  expectations; two historical examples (HAVC `courseListHeader`, CMS
  duplicate MATH 24 block) each took minutes once the message was read.
- Check the manifest: quarantine count was **0** last edition. Any
  quarantined course → inspect before proceeding; a nonzero rate usually
  means a new prose pattern the structurer needs, not bad luck.

**GATE 3:** finalized structured snapshot; course count within ~5% of
baseline unless the diff explains why; quarantine = 0 (or each case
understood and documented in the PR).

## Phase 4 — Major requirements (Local LLM — serial, AFTER Phase 3)

```bash
python -m ucsc.major_requirements.fetch       # index + ~121 program pages
python -m ucsc.major_requirements.run         # segment → classify; LLM fallback calls
```

- New programs appear / old ones vanish at editions — the index diff is
  expected content, not drift.
- Classifier misreads on *new prose patterns* are the main risk. They
  surface later in verification (Phase 6); don't try to pre-fix here.

**GATE 4:** finalized snapshot, program count ≈ index count, zero aborts.

## Phase 5 — Export & the hand-edited merge protocol

```bash
python -m ucsc.export_committed               # writes data-committed/, NEVER --force blanket
git diff --stat data-committed/               # the review artifact
```

The exporter: updates pipeline-pure files in place, resets `verification`
to `unverified` wherever content changed, and **refuses to touch
`origin: hand-edited` files**, printing each skipped slug.

**For every skipped hand-edited slug** (~80 expected):

1. Render the *new* official page:
   `python -m ucsc.major_requirements.render_page <slug>` and diff against
   the committed JSON's structure.
2. **Official page unchanged** → keep the hand-edited file as-is (its
   verification stands). Most files land here in a typical year.
3. **Official page changed** → regenerate just that program
   (`python -m ucsc.major_requirements.run --slugs <slug>`), then
   three-way-compare: old hand-edited vs new pipeline output vs new page.
   Port the manual corrections onto the new output *only where the new page
   still warrants them*, write with the canonical dump
   (`json.dumps(..., indent=1, ensure_ascii=False, sort_keys=True) + "\n"`),
   set `origin: hand-edited` if manual content survived (else
   `local-llm-pipeline`), and leave `verification: unverified` — Phase 6
   re-earns it.
4. `--force` is only ever per-file, only after step 3, never as a shortcut.

**GATE 5:** exporter clean; every hand-edited slug dispositioned (2 or 3);
`git diff data-committed/` read in full — every hunk either expected
(edition change) or explained; diff committed on the refresh branch.

## Phase 6 — Re-verification campaign (Frontier LLM agents)

Every program whose `verification.status` is now `unverified` (changed
content) or `failed-verification` must be re-verified **before load**.

- Method + pass/fail criteria: `docs/universities/ucsc/VERIFY_METHOD.md`
  (includes the repair protocol for failures).
- Ground truth: `render_page.py` output, never a live fetch mid-review.
- Run verifier agents in parallel waves (they are Frontier-LLM readers, not
  Ollama users — the serial constraint does not apply). Last campaign:
  26 agents, 3 waves, 119/119. Reports go to `_reports/<slug>.md`; repair,
  then re-verify until reports are empty.
- Append a campaign entry to `docs/universities/ucsc/VERIFICATION.md`.

**GATE 6:** zero programs `unverified` or `failed-verification` in
`data-committed/ucsc/programs/`; campaign logged.

## Phase 7 — Load

```bash
ops/backup/backup.sh                          # pre-load restore point
cd backend
DATABASE_URL=... .venv/bin/alembic upgrade head
DATABASE_URL=... .venv/bin/python -m app.loaders.ucsc      # all sources + availability
```

The loader upserts by code/slug (ids survive → user plans stay coherent),
rebuilds prereq edges whole, unions offering snapshots (newest wins per
term), then derives availability, instructor predictions, and **dormant
flags** (dormant = zero offering rows in the loaded window).

Rollback if wrong: committed data → `git checkout <rev> -- data-committed/`
+ reload; snapshots → `--courses/--offerings/--soe <older-dir>`; both are in
`docs/OPERATIONS.md` / `ops/backup/README.md`.

**GATE 7:** loader summary counts consistent with Phases 2-5; `pipeline_runs`
rows recorded; no tracebacks.

## Phase 8 — Acceptance

```bash
cd pipelines && python -m pytest
cd ../backend && .venv/bin/python -m pytest
cd ../frontend && npx playwright test         # 9 e2e tests need the loaded stack
```

Then compare against the Phase 0 baseline and sanity-check by hand:

- Course/offering/program counts moved in explainable directions.
- Dormant count: recompute changes it — a jump means the window slid or a
  department's data vanished; explain it.
- Open 2-3 programs in the UI (one hand-edited, one pipeline-pure, one new
  this edition) against their official pages; open one course drawer and
  check the offering-history pivot shows the new terms.
- e2e fixtures pin real entities (e.g. CSE 101 instructors, a dormant CSE
  course, program names). An edition roll can legitimately break these —
  update the *fixture*, never weaken the assertion.

**GATE 8:** all three suites green (check exit codes, not output tails);
spot checks pass; anomalies vs baseline explained in the PR body.

## Phase 9 — Ship

- PR per the repo's workflow: code/pipeline fixes and the data-committed
  diff, with the Phase 8 comparison and hand-edited dispositions in the
  body. Merge, sync main.
- `ops/backup/backup.sh` for a post-refresh restore point.
- Update `docs/universities/ucsc/VERIFICATION.md` if not done in Phase 6,
  and this runbook wherever reality diverged from it — the next agent
  inherits your corrections.
