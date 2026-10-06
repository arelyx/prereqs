# Harnesses: authoring and refresh guide (approach C, "harness as code")

A harness is everything the app knows about one program in one catalog
edition, written as a TypeScript module by an agent reading the committed
source text. This guide is for the agent that maintains all 119 programs
across years. Follow it in order; do not improvise the sequence.

```
harnesses/ucsc/<edition>/<slug>/
  harness.ts        the program's requirements as code (required)
  harness.test.ts   vitest cases written from the source text (required)
  manifest.json     contract fields, hashes from programs.json (required; written by a tool)
  View.tsx          bespoke dashboard (optional; only where the program's shape needs one)
```

Code that is not in a harness:

| Path | What |
|---|---|
| `frontend/src/harness/` | the standard library (`@harness`): types, course sets, grades, allocation, per-term helpers, `HarnessContext`, runner |
| `frontend/src/harness/registry.ts` | browser registry: Vite globs `../harnesses/ucsc/*/*/` — a new directory is picked up with no app change |
| `frontend/src/components/degree/` | default dashboard renderer + building blocks Views import (`@app/components/degree/...`) |
| `frontend/harness-tools/` | node tooling: `catalog.ts` (committed catalog), `testing.ts`, `lint.ts`, `manifest.ts`, `port.ts`, `profile.ts` |
| `eval/adapters/c-code.{ts,sh}` | eval adapter (runs harnesses under node) |
| `backend/app/api/catalog.py` `GET /u/{univ}/catalog/compact` | catalog facts the browser evaluates against |

Harnesses run **client-side** (instant feedback on every edit) and under
node (tests, lint, eval) against the same catalog facts.

## 1. Rules for harness code

1. **Pure.** No network, DOM, clock, randomness, globals, or I/O. Everything
   arrives through `h` (the `HarnessContext`). Same input ⇒ same report.
2. **Every node cites the source verbatim** (`quote`). Lint fails otherwise.
   Quote the sentence that states the rule, not a paraphrase.
3. **Never be confidently wrong.** If the page defers to an external list or
   leaves a case open, return `cannot-check` (with what to check) or ask the
   student to declare something (`needs-choice`) — never `met` on a guess, and
   never `unmet` when an unclassifiable candidate exists.
4. **Attestations are for non-course conditions only** (juries, auditions,
   exams, petitions, admission to a selective concentration, advisor waivers).
   Course credit by AP/transfer is a course in the plan (`completed`), not an
   attestation. Eval cases default to `attested: "all"`, so an attestation
   that hides a course rule turns a real failure into a pass.
5. **Qualification / declaration rules are not completion rules** (they gate
   entry). Show them as `h.info(...)` unless the page makes them part of the
   degree.
6. **Checks must be cheap.** `check` callbacks run once per candidate
   combination inside the allocator. Precompute maps at module scope; never
   build `codes(...)` sets inside a check.
7. Comment every non-obvious decision with the quote that justifies it.

## 2. API reference (`import { ... } from '@harness'`)

### Module shape

```ts
export default defineHarness({
  program: 'music-bm', edition: '2026-27', title: 'Music B.M.',
  choices?: ChoiceDef[],        // declared choices (concentration, track, entry…)
  attestations?: AttestationDef[],
  catalogNeeds?: { descriptions?: ['LIT'] },   // subjects whose descriptions you read
  notes?: string[],             // program-wide caveats shown at the top
  coverage?: { ignore?: {CODE: reason}, unknownOk?: {CODE: reason} },  // lint acknowledgements
  evaluate(h): Node[]           // top-level requirement nodes, in page order
})
```

`ChoiceDef`: `{key, label, quote, options: [{value, label, aliases?}], when?(choices), default?, parse?(raw), free?, input?: 'term'}`.
Free-form values from eval/transcripts are matched to options by
normalized value/label/aliases, or by `parse`. `when` hides a choice until it
applies (track only for Creative Writing).

`AttestationDef`: `{id, label, quote, aliases?}` — free-form attested names
match by id/label/alias (lower-case substring of ≥4 chars).

### Course sets

`codes('MUSC 101A', …)`, `lettered('MUSC 101', 'ABC')`, `range('CSE', 100, 189)`,
`series('LIT', 61)` (61, 61A, 61B…), `subject('ANTH', 'upper')`, `anyOf(a, b)`;
chain `.or(x)`, `.except(['CSE 115A'])`, `.minCredits(5)`,
`.where(c => …, 'description')`. Every set has `describe` for the UI.
`canon('CSE 13S') === 'CSE13S'`, `display('CSE13S') === 'CSE 13S'`.

### Builders on `h`

| Builder | Use |
|---|---|
| `h.take(id, title, quote, set, opts)` | take `n` (default 1) courses from `set` |
| `h.all(id, title, quote, ['CSE 12', …])` | every listed course (one exclusive slot each), shown as one checklist row |
| `h.options(id, title, quote, [[…],[…]])` | one complete package ("either 19A+19B or 20A+20B") — ONE slot |
| `h.group(id, title, children)` | all children required (roll-up = worst child) |
| `h.either(id, title, quote, children)` | any child (roll-up = best child) |
| `h.attest(attId)` | non-course condition node |
| `h.needChoice(key)` | returns a needs-choice node, or `null` once chosen |
| `h.node(id, title, quote, status, extra)` | a node whose status your own code computed |
| `h.cannotCheck(id, title, quote, detail)` | explicit "check yourself" |
| `h.info(id, title, quote, detail)` | policy note; never affects completion |
| `h.solve()` | allocate every pending slot now, so later code can read `node.status`/`node.used` |

`take` options: `n`, `atLeast: [{set, n, label}]`, `atMost: [{set, n, label}]`,
`check(chosen) => reason | null`, `labs` (`'catalog-required'` — a lecture
counts only with its `<code>L` lab and they count as one; `'catalog-merge'`;
or `{pairs: [[lec, lab]], mode}`), `repeatable` (`true` | `'catalog'`),
`policy` (grade rule for this slot; `{}` = none, `undefined` = inherit
`h.policy`), `exclusive` (default `true`; `false` = overlay that may reuse
courses, e.g. DC), `prefer(code)` (candidate order), `composite` (multi-course
units such as "two physics classes count as one elective"), `pool`, `notes`.

Student facts: `h.choice(key)`, `h.entry`, `h.attested(id)`, `h.enrollments`
(every occurrence, with `term`, `grade`, `planned`), `h.passed`, `h.taken(set, policy?)`,
`h.catalog.get(code)` (`credits`, `division`, `title`, `crossListed`,
`repeatable`, `description` for `catalogNeeds` subjects), `h.used` (ids
consumed by exclusive slots so far).

Grades: `h.policy = { letter: true }` (no P/NP), `{ min: 'C', pCounts: true }`.
Unknown grade = passing letter. Failing grades never count. Exclusions are
listed under "Not counted because of a grade rule" with the reason.

Per-term: `season(term)`, `isSummer`, `nextRegular`, `regularQuarters(from, to)`,
`byTerm(enrollments)`, `enrolledTerms`, `termLabel`.

### Allocation semantics (read this before writing slots)

All pending **exclusive** slots in one `solve()` share one allocation: a course
counts toward at most one of them. The solver is an exhaustive, bounded,
deterministic search maximizing the number of fully satisfied slots; slots
are tried most-specific first (fewest eligible enrollments), so explicit lists
keep their courses and open pools take what is left. A deterministic work
budget (`WORK_BUDGET`) bounds time; if it is exhausted, unsatisfied slots
become `cannot-check`, never `unmet`.

Pitfall (lint-enforced): alternatives must not be separate exclusive slots in
sibling branches of `h.either` — the allocator would treat each branch as
required and they would compete. Use one `h.options` slot, or overlays.

### Report and statuses

`runHarness(harness, student, catalog)` evaluates twice — completed courses
only, then with planned ones — and marks leaves met only with planned courses
`in-progress`. Statuses: `met`, `in-progress`, `unmet`, `needs-choice`,
`needs-attestation`, `cannot-check`, `info`. Eval verdict: any
unmet/in-progress/needs-attestation ⇒ `false`; else any needs-choice /
cannot-check ⇒ `null`; else `true`.

### Bespoke Views

`View.tsx` default-exports a component receiving `ViewProps` (`report`,
`harness`, `onOpenCourse`, `setChoice`, `setAttested`). Import building blocks
from `@app/components/degree/DefaultReport` (`NodeList`, `ChoiceBar`,
`ChoiceControl`, `Leftovers`, `Summary`) and `@app/components/degree/ui`
(`Card`, `CourseChip`, `StatusIcon`, `StatusPill`, `Quote`). A harness passes
View-only data on a node's `data` field (JSON). Write Views only where the
program's shape is genuinely different (time-based, matrix-like, choice-led);
everything else uses the default renderer. Views must not compute
requirement logic — only present the report (importing constants from the
harness module, as psychology's board does with `SUBFIELDS`, is fine).
Tailwind scans `../harnesses` (`@source` in `src/index.css`). In `vite dev`,
restart the dev server after adding a new `View.tsx` or harness directory.

## 3. Authoring a new harness (step by step)

1. Read `data-committed/ucsc/editions/<ed>/sources/<slug>.md` top to bottom.
   Note every completion rule, every overlap statement ("may also count",
   "may not fulfill any other"), grade rules, per-term rules, choices,
   attestations, external lists.
2. Copy the closest existing harness as a template (`harnesses/ucsc/<ed>/`).
3. Write `harness.ts`: one top-level node per page section, in page order.
4. Write `harness.test.ts`: a complete passing record, then one test per
   caveat (each a single edit of the passing record). Write tests from the
   page, never from the harness.
5. `cd frontend`
   - `npx vitest run ../harnesses/ucsc/<ed>/<slug>`
   - `npx tsx --tsconfig tsconfig.harness.json harness-tools/manifest.ts <ed> <slug> --draft`
   - `npm run harness:lint -- <ed>/<slug>` — quotes verbatim, catalog codes,
     every source course row referenced (or `coverage.ignore` with a reason),
     manifest hashes current, no authoring errors.
   - `npx tsx --tsconfig tsconfig.harness.json harness-tools/profile.ts <ed>/<slug>` —
     worst case (every course named, one term) should stay well under 1 s.
   - `npm run typecheck`
6. Re-read the source **line by line** against the code. Only then:
   `manifest.ts <ed> <slug> --verified --notes "<method>"`.
7. `python eval/run.py --adapter eval/adapters/c-code.sh` (repo root). Fix a
   harness only when the SOURCE supports the change; if a golden case looks
   wrong, report it with the quote — never edit it.
8. Commit the directory (one program per commit is easiest to review).

## 4. Refresh: a new edition (or a changed source)

`python -m ucsc.refresh status` (from `pipelines/`) lists stale or missing
harnesses. For each:

1. `cd frontend && npx tsx --tsconfig tsconfig.harness.json harness-tools/port.ts <slug> <old-ed> <new-ed>`
   — copies the directory, rewrites the edition, writes a draft manifest
   pinned to the new hashes, prints `diff -u` of the two sources and lints
   the copy against the new text. The lint output is your work order:
   every quote that no longer appears verbatim and every course row the
   harness does not reference.
2. Read the whole diff, not just the lint hits — a rule can change without
   touching a quoted sentence (a list item removed, a heading re-scoped).
3. Edit `harness.ts`; add a test for each changed rule (name it `<ed>: …`).
4. Tests, lint, typecheck, profile; re-read; `manifest.ts … --verified`.
5. Wording-only changes (same skeleton hash): read the diff; if no rule
   changed, `manifest.ts <ed> <slug> --verified` refreshes the hashes.
6. Golden cases are per edition; re-check them against the new source.

Old editions stay: the app picks the harness for the plan's `catalog_year`.

## 5. Reviewing a harness (for humans and agents)

`git diff` the directory. Then: (1) lint must pass — it guarantees quotes are
verbatim and every course row is referenced, so review effort goes to logic;
(2) open the dashboard with the source page beside it — each requirement has
a “” toggle showing the exact sentence it implements; (3) read the tests as a
list of the program's caveats; (4) check every `cannot-check`, attestation,
`exclusive: false` and `check` against the quote it cites.
