# FAIL report: biomolecular-engineering-and-bioinformatics-bs

## 1. Bioinformatics Concentration > Lower-Division Courses > "Statistics" — wrong operator (all_of vs one_of)

**Page says**:

```
[h5 sc-level-3] Statistics
  P: One of  the following:
    * CSE 40
    * STAT 132
```

**JSON has** (`title: "Lower-Division Courses"`, Bioinformatics concentration,
`source.heading: "Statistics"`):

```json
{"op": "all_of", "courses": ["CSE40", "STAT132"]}
```

This forces BOTH courses; the page requires exactly one.

**Smallest correct representation**:

```json
{"op": "one_of", "courses": ["CSE40", "STAT132"]}
```

## 2. Biomolecular Engineering Concentration > Comprehensive Requirement — capstone options mis-typed; no section_choice; Option 3 dropped to `info`

**Page says**:

```
[h4 sc-level-2] Comprehensive Requirement
  P: To complete the senior capstone requirement, biomolecular engineering
     concentration students must complete one of the following options:
[h5] Option 1: BME Team Design    -> BME 129A, BME 129B, BME 129C
[h5] Option 2: iGEM               -> BME 180, BME 188A, BME 188B, BME 188C
[h5] Option 3: Bioinformatics Capstone -> BME 205, BME 230A, BME 129C
[h5] Option 4: Senior Thesis      -> BME 195
```

i.e. choose ONE of four options; each option is all_of its courses.

**JSON has**: an intro `info` rule, then the four options typed
inconsistently and with no `section_choice` wrapper to express
"complete one of the following options":

- Option 1 (`BME129A/B/C`): `"op": "unknown"`, `"needs_review": true`
- Option 2 (`BME180/188A/188B/188C`): `"op": "unknown"`, `"needs_review": true`
- Option 3 (`BME205/230A/129C`): `"op": "info"`  ← treated as advisory / never
  required, but it is a genuine required capstone choice
- Option 4 (`BME195`): `"op": "all_of"`

Compare the Bioinformatics concentration's comprehensive section, which does
carry a leading `section_choice` rule.

**Smallest correct representation**: a leading `section_choice` rule, then the
four options each as `all_of` over their courses (Option 3 must NOT be `info`;
Options 1 and 2 must be resolved from `unknown` to `all_of`).

## 3. Bioinformatics Concentration > Comprehensive Requirement > "Option 1: Bioinformatics Capstone" — unresolved operator

**Page says**:

```
[h5 sc-level-3] Option 1: Bioinformatics Capstone
    * BME 205
    * BME 230A
    * BME 129C
```

All three courses required (it is one branch of the section_choice).

**JSON has**: `"op": "unknown"`, `"needs_review": true` over
`[BME205, BME230A, BME129C]`.

**Smallest correct representation**:

```json
{"op": "all_of", "courses": ["BME205", "BME230A", "BME129C"]}
```

(The section_choice wrapper is already present for this concentration; only the
option's own operator is unresolved.)
