# eval/ — approach-agnostic correctness checks for program harnesses

Golden cases are hand-built student records with a known verdict, written
from the official catalog text ONLY (`data-committed/ucsc/editions/<ed>/sources/<slug>.md`),
never from any harness. Every requirement-tracking approach is scored against
the same cases through a small adapter (see `eval/run.py`).

A held-out split of the cases lives OUTSIDE the repo
(`~/prereqs_revamp/eval-holdout/`) so approaches cannot be tuned to it.

## Case file: `eval/golden/<slug>.json`

```json
{
  "program": "music-bm",
  "edition": "2026-27",
  "author_notes": "how the cases were chosen; ambiguities in the source text",
  "cases": [
    {
      "id": "fail-core-history-only-one-101abc",
      "kind": "fail",
      "description": "Took 4 core history courses but only one of MUSC 101A/B/C.",
      "student": {
        "entry": "frosh",
        "choices": {"instrument": "piano"},
        "terms": [
          {"term": "2248", "courses": ["MUSC 30A", "MUSC 31", "MUSC 2"]},
          {"term": "2250", "courses": ["MUSC 30B", "MUSC 31", "MUSC 2"]}
        ],
        "grades": {"MUSC 30A": "B+"},
        "attested": "all"
      },
      "expect": {
        "complete": false,
        "failing_requirement": "Core History/Culture: at least two of the four must be MUSC 101A, 101B or 101C",
        "source_quote": "At least two of the courses must be MUSC 101A, 101B, or 101C."
      }
    }
  ]
}
```

Field semantics:

- `kind`: `pass` (record satisfies every requirement of the program) or
  `fail` (a near miss: EXACTLY ONE requirement is unmet; everything else is
  satisfied, so the verdict isolates one rule).
- "Complete" means the program's own requirements (major/minor course
  requirements, DC, comprehensive/capstone, concentration if any, program
  GPA/grade rules). It excludes campus-wide requirements (GE, 180 units,
  residency, college core) and major qualification/declaration/transfer
  screening (those gate entry, not completion), unless the program page makes
  them part of the degree requirements.
- `student.terms`: chronological quarters (pisa term codes: `2` + YY +
  0 winter / 2 spring / 4 summer / 8 fall). Every listed course is completed
  with a passing grade unless `grades` says otherwise. Courses use display
  codes (`MUSC 30A`). Prerequisite order is NOT evaluated.
- `student.entry`: `frosh` or `transfer` (some programs differ).
- `student.choices`: free-form declared choices (concentration, track,
  instrument, option/path); the description must say them in words too.
- `student.grades`: optional letter grades (default `A`), `P`/`NP` allowed.
- `student.attested`: conditions that cannot be checked from courses
  (auditions, juries, portfolios, petitions, department approval). `"all"`
  (default) = every such condition is satisfied; or a list of short names
  of those satisfied — anything omitted is NOT satisfied.
- `expect.failing_requirement` / `source_quote`: fail cases only; the quote
  is verbatim from the source text.

## Adapter verdict contract

An adapter receives one case and returns:

```json
{"complete": true | false | null, "unmet": ["human-readable requirement", "..."], "note": "..."}
```

`null` = the approach abstains (cannot decide). Scoring: verdict correct /
wrong / abstain per case; for fail cases a grader also checks whether
`unmet` names the requirement in `failing_requirement`.
