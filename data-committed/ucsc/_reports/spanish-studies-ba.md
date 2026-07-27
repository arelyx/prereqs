# spanish-studies-ba — verification failures

## 1. Choice of Concentrations: either/or choice lost — both concentrations required

**Page says** (rendered source):

```
[h5 sc-level-3] Choice of Concentrations
  P: Students must choose either the Languages and Linguistics Concentration or the Literature and Culture Concentration ...
[h6 sc-level-4] Languages and Linguistics Concentration
  P: Three courses from the following list that are not used as an elective or capstone:
    * SPAN 130 /LGST 130A ... (18 courses)
[h6 sc-level-4] Literature and Culture Concentration
  P: Three 5-credit literature courses numbered LIT 188-LIT 189, LIT 199. Current courses within this range are listed below.
    * LIT 188A ... (21 courses)
```

One concentration is chosen; three courses are taken within it.

**JSON has**: an `info` rule ("Choice of Concentrations") followed by two sibling
required rules — `n_of` n=3 over the 18 L&L courses and `n_of` n=3 over the 21 L&C
courses — both with `concentration: null`. Machine-read, both concentrations are
required simultaneously (six courses), and neither rule is attributed to a
concentration.

**Smallest correct representation**: a `section_choice` between the two concentration
subrules (each `n_of` n=3, membership unchanged), or the two rules attributed to their
respective concentrations via the `concentration` field, so exactly one branch applies.

## 2. Comprehensive Requirement: concentration-specific capstone mangled

**Page says**:

```
[h4 sc-level-2] Comprehensive Requirement
  P: The senior comprehensive requirement is satisfied by completing one capstone course in the student's concentration listed below. ...
[h5 sc-level-3] Languages and Linguistics Capstone Courses
    * SPAN 151 ... (7 courses)
[h5 sc-level-3] Literature and Culture Capstone Course
    * LIT 190X /SPAN 190A
```

One capstone course, drawn from the list matching the student's concentration.

**JSON has**:
- "Languages and Linguistics Capstone Courses": `"op": "unknown"`, `needs_review: true`
  over the 7 SPAN courses — unresolved where the page states choose-one.
- "Literature and Culture Capstone Course": `"op": "all_of"` with ["LIT190X"] — LIT 190X
  asserted as required for every student, regardless of concentration.
- Neither rule carries a `concentration` attribution.

**Smallest correct representation**: a `section_choice` (or concentration-attributed
pair): L&L branch = `one_of` over [SPAN151, SPAN152, SPAN153, SPAN154, SPAN155, SPAN157,
SPAN158]; L&C branch = `all_of` ["LIT190X"]; with the no-double-count rider ("cannot be
used for the elective or concentration requirements") as constraint prose.
