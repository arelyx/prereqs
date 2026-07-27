# politics-ba — verification failures

## 1. Section: Comprehensive Requirement — entire requirement coded as `info` (dropped)

**Page says** (rendered snapshot):

```
[h4 sc-level-2] Comprehensive Requirement
  P: The comprehensive requirement in the Politics Department can be satisfied in any of the following methods:
  LI: Senior Seminar: ... a politics senior seminar (POLI 190 series) ...
  LI: Additional (Fifth and Sixth) Electives: ... two additional politics upper-division electives numbered POLI 100 -189, one of which includes a substantial writing component ... must enroll in a two-credit independent study, POLI 199F ...
  LI: Graduate Seminar: ... a politics graduate seminar ...
  LI: Thesis (2-3 quarters): ... a senior thesis ( POLI 195A , POLI 195B , POLI 195C ) ...
```

This is a required senior-exit requirement with four completion methods.

**What the JSON has**: a single rule with `"op": "info"`, `"courses": []`.
`info` means advisory/never-required, so the entire comprehensive
requirement is dropped from the machine-readable requirements.

**Smallest correct representation**: a `section_choice` parent with one
subrule per method, e.g. the thesis branch as `all_of`/`n_of`
(POLI 195A/195B/195C), the senior-seminar branch as a `range`/`category_count`
over the POLI 190 series, the two-electives-plus-POLI 199F branch, and the
graduate-seminar branch as `category_count` with `needs_review` (genuinely
unlisted). Unlisted branches may use `needs_review`, but the requirement must
not be `info`.

## 2. Section: Upper-Division Courses / "Four upper-division politics core courses" — 2+1+1 group distribution lost

**Page says**:

> P: The following four groups of courses constitute the core of the politics
> major. Four courses are required: **two courses from one group, one course
> from a second group, and one course from a third group.**

i.e. four courses spanning at least three of the four groups (Theory,
U.S. Politics, Comparative, Global) in a 2+1+1 pattern.

**What the JSON has**: a parent `"op": "n_of"`, `"n": 4`,
`"from_following_lists": true` drawing on the four group `list` subrules,
with **no** `constraints`/`notes` capturing the distribution (it survives
only in `source.prose`). As encoded, all four could come from a single group,
which the page forbids.

**Smallest correct representation**: `n_of_groups` expressing "2 from one
group, 1 from a second, 1 from a third" over the four groups, or the existing
`n_of` with the distribution kept as an explicit `constraints` entry.
