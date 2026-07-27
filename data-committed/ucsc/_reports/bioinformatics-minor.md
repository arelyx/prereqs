# bioinformatics-minor — verification failures

## 1. Upper-Division Courses > Programming recorded as `info` (requirement dropped)

**Page says** (rendered source):

```
[h4 sc-level-2] Programming
    * BME 160
    * BME 163
  NOTE: Students may substitute CSE 20 for BME 160 , although BME 160 is strongly recommended. CSE 20 has a test-out exam that will also be accepted.
```

Two plain course rows with no choice prose — both BME 160 and BME 163 are required
(with a CSE 20 substitution rider for BME 160).

**JSON has**: the Programming rule with `"op": "info"` and `courses: ["BME160",
"BME163"]`. Per the schema, `info` is advisory/policy prose and never required, so the
Programming requirement is lost.

**Smallest correct representation**: `"op": "all_of"` with courses [BME160, BME163],
keeping the CSE 20 substitution sentence in `notes` (prose rider, acceptable as text).

## 2. Electives: stated count ("two or more") not captured

**Page says**:

```
[h3 sc-level-1] Electives
  P: Choose two or more electives to meet the requirement of 25 credits of upper-division credits:
    * BME 118
    * BME 122H
    ... (10 courses)
```

**JSON has**: `"op": "list"`, `"n": null`. `list` is defined as a pool drawn from by a
counting parent, but there is no counting parent; the rule as committed carries no count,
so the "choose two or more" requirement is unenforced.

**Smallest correct representation**: `"op": "n_of"` with `n: 2` over the 10 listed
courses, with the 25-upper-division-credit rider kept in `notes`/`constraints` (e.g.
"two or more, to meet the requirement of 25 credits of upper-division credits").
