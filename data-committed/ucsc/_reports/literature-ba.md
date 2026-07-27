# literature-ba — verification failures

## Sections: Lower-Division Requirements (all three concentrations) — required LIT 60/61- or 80/81-series course dropped

**What the page says** (identical block in General, Language Literature, and
Creative Writing concentrations):

```
[h5 sc-level-3] Plus one of the following options:
  LI: One course from the LIT 60 or LIT 61-series, or
  LI: One course from the LIT 80 or LIT 81-series
```

This is one of the two required lower-division courses ("The 12 required
courses must include two lower-division and 10 upper-division courses").

**What the JSON has**: in all three concentrations the rule is
`"op": "info"`, `"courses": []`, `"n": null`, carrying only the series
descriptions in notes/prose. `info` is never required, so the second
lower-division course requirement is dropped from the machine-readable
requirements.

**Smallest correct representation**: a `range` rule with `"n": 1` whose
filter includes the LIT 60, LIT 61, LIT 80, and LIT 81 series (or a
`category_count` n=1 with needs_review), in each concentration's
lower-division section.

## Section: Creative Writing Concentration — Upper-Division Literature Electives dropped

**What the page says**:

```
[h5 sc-level-3] Upper-Division Literature Electives
  P: Students take seven 5-credit upper-division literature electives numbered 108-189. ...
[h6 sc-level-4] Advanced Creative Writing Workshop Requirements
  P: Creative Writing students take any three courses from the LIT 179 series. ...
```

**What the JSON has**: both rules are `"op": "info"` with `"n": null` and no
filter — unlike the General and Language Literature concentrations, where the
seven-elective requirement is a `range` rule with `"n": 7`. The Creative
Writing concentration therefore has no machine-readable seven-elective
requirement, and the three-course LIT 179 workshop requirement is likewise
only prose.

**Smallest correct representation**: a `range` rule, `"n": 7`, include range
LIT 108-189 (mirroring the other concentrations), and a `range` (or `n_of`)
rule with `"n": 3` over the LIT 179 series for the workshop requirement (with
the repeatability note carried as prose — repeat-counting itself is an
in-scope subtlety).

## Sections: Distribution Requirements (all three concentrations) — the four distribution items are missing

**What the page says** (identical h6 block in each concentration):

```
[h6 sc-level-4] Distribution Requirements
  P: Students should consult the Distribution Requirements Course List to find courses which satisfy one or more of the following requirements:
  LI: Two courses on literature written before 1750
  LI: One course on non-Western literature or literature from a global perspective
  LI: One course on poetry and poetics
  LI: One course introducing research tools and methodologies
```

**What the JSON has**: an `"op": "info"` rule whose prose contains only the
introductory sentence; the four LI requirement lines appear nowhere in the
file (not as rules, constraints, or notes). The distribution requirements
(2 + 1 + 1 + 1 courses among the seven electives) are dropped entirely.

**Smallest correct representation**: four `category_count` rules
(needs_review: true, membership defined by the department's Distribution
Requirements Course List) with n = 2, 1, 1, 1 respectively — or at minimum
the four lines carried as constraints on each concentration's seven-elective
range rule ("one course may fulfill more than one requirement" as a note).

## Additional weak representation (minor)

Language Literature "Language Requirements" (five literature courses in the
chosen language of concentration, overlap with distribution allowed) is an
`info` rule carrying the full prose; as a required rider over the seven
electives it would better be a constraint on the elective rule or a
`category_count` n=5 with needs_review.

## Checked and matching (not discrepancies)

LIT 1 all_of in each concentration; LIT 101 + LIT 102 all_of with LIT 102
substitution note; General (LIT 109-189, n=7) and Language Literature
(LIT 108-189, n=7) elective range rules incl. LIT 179A/B excludes; DC
(LIT 101, with seminar/thesis half carried in prose and enforced via the
Comprehensive section); Comprehensive section_choice with Senior Seminar and
Senior Thesis/Essay branches per concentration (190U/190Y/190AA, 195A/195B,
190V/190W, 195C); Creative Writing lower-division LIT 90-series one_of;
Language Proficiency policy one_of over the 11 level-3 courses with exam and
placement alternatives carried in prose.
