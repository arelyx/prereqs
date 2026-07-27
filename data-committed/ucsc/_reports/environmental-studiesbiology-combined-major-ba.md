# FAIL report: environmental-studiesbiology-combined-major-ba

## 1. Upper-Division Courses — "one of the following" choice collapsed into all_of

**Page says**:

```
[h4 sc-level-2] Upper-Division Courses
  P: All of the following courses:
       ENVS 100, ENVS 100L, BIOE 109
  P: Plus one of the following courses:
       BIOL 105, BIOE 106
    * ENVS 100
    * ENVS 100L
    * BIOL 105
    * BIOE 106
    * BIOE 109
```

Required: ENVS 100 + ENVS 100L + BIOE 109 (all), PLUS one of {BIOL 105, BIOE 106}.

**JSON has**:

```json
{"op": "all_of", "courses": ["ENVS100","ENVS100L","BIOL105","BIOE106","BIOE109"]}
```

This forces BOTH BIOL 105 AND BIOE 106; the page requires only one of them.

**Smallest correct representation**: two rules —
`all_of [ENVS100, ENVS100L, BIOE109]` and `one_of [BIOL105, BIOE106]`.

## 2. Electives — required counts/ranges missing and section mis-structured

**Page says**:

```
[h4 sc-level-2] Electives
  P: Students take six 5-credit or more upper-division electives as follows...
  LI: Three electives from environmental studies (ENVS 101-179). At least one of
      these courses must be from the ENVS electives based in the social sciences
      list below.
  LI: One course from the lab-based elective list below
  LI: Two courses from BIOE 107 -188 and/or BIOL 100 -140
[h5] ENVS electives based in the social sciences: (20 ENVS courses)
[h5] Lab-based elective options: (65 courses)
```

Three distinct required components: (a) three from ENVS 101-179 (range, n=3, with
"at least one from the social-sciences list" rider); (b) one from the lab-based
list; (c) two from BIOE 107-188 and/or BIOL 100-140 (range, n=2).

**JSON has**:

- A leading `"op": "section_choice"` rule (with the prose carried as
  constraints). `section_choice` means "choose one of the following subrules",
  which is the wrong semantics — all three components are required together.
- `"ENVS electives based in the social sciences:"` as `"op": "unknown"`,
  `needs_review: true` (20 courses). The "three from ENVS 101-179" count and the
  ENVS 101-179 range itself are not represented as an operator.
- `"Lab-based elective options:"` as `one_of` (65 courses) — the only piece that
  is roughly right (one course).
- **The entire "Two courses from BIOE 107-188 and/or BIOL 100-140" requirement
  is absent** — there is no rule, list, or range for it.

**Smallest correct representation**: an `all_of`/group of three sibling rules:
`n_of` n=3 over a `range` ENVS 101-179 (with the social-sciences rider as a
constraint), `one_of` (or n_of n=1) over the lab-based list, and `n_of` n=2 over
a `range` covering BIOE 107-188 and BIOL 100-140.

## 3. Disciplinary Communication (DC) Requirement — required courses left as `unknown`

**Page says**:

```
[h5 sc-level-3] The DC requirement ... is satisfied by completing
    * ENVS 100
    * ENVS 100L
[h5 sc-level-3] Plus one of the following:  (31-course list)
```

**JSON has**: the ENVS 100 / ENVS 100L rule as `"op": "unknown"`,
`needs_review: true`. (The "Plus one of the following" one_of over the 31 courses
is correct.)

**Smallest correct representation**:

```json
{"op": "all_of", "courses": ["ENVS100", "ENVS100L"]}
```
