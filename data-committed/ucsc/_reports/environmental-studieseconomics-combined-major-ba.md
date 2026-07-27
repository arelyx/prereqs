# environmental-studieseconomics-combined-major-ba — verification failures

## Section: Electives

### Six-elective requirement (3 + 3) collapsed into a single n=3 rule

Page says:

> P: Six upper-division elective courses as follows:
> LI: Three courses from the Economics Electives list below
> LI: Three courses from ENVS 101-179. At least one course must be from the list of environmental studies electives in the natural sciences list below.

JSON has one counting rule for the whole section:

```json
"op": "n_of", "n": 3, "from_following_lists": true
```

followed by the two `list` pools (Economics Electives; Environmental studies
electives in the natural sciences). As encoded, this reads as "three courses
from the following lists" — half of the stated six-course requirement. The
three-course ENVS 101-179 component survives only as a prose constraint, its
range membership (ENVS 101-179, which is broader than the natural-sciences
list) is not machine-recorded, and the total of six is recorded nowhere.

Smallest correct representation: two sibling counting rules —
(1) `n_of` with `n: 3` drawing on the Economics Electives `list`;
(2) a `range` rule with `n: 3` and include range ENVS 101-179, carrying
"at least one course must be from the natural sciences list below" as a
constraint, with the natural-sciences `list` as its reference pool.
(List memberships themselves match the page.)

## Section: Comprehensive Requirement (secondary)

### Second required component (economics comprehensive exam) not carried as a constraint

Page says:

> P: Students in ENVS/ECON satisfy the senior comprehensive requirement by completing both of the following:
> LI: One of the senior exit options for environmental studies B.A. ...
> LI: Pass those portions of the economics comprehensive examination administered in ECON 100A and ECON 113 .

JSON has a single `options` rule whose branches correctly match the six
narrative-marker senior-exit options, and whose `constraints` carry the first
LI and the thesis-planning paragraph — but the "Pass those portions of the
economics comprehensive examination" component appears only in `source.prose`,
not in `constraints`/`notes`. Since the page says BOTH components are
required, the exam rider should at minimum be a `constraints` entry on the
rule.

## Section: Transfer Admission Screening Policy (secondary)

### "Plus one of the following:" coded as dangling `section_choice`

Page says:

> [h5] Plus one of the following:
>   P: ENVS 25
>   P: or
>   P: A course in national or international politics

JSON codes this as `"op": "section_choice"` with no courses and no following
subrules belonging to it — under section_choice semantics ("choose one of the
following subrules") this wrongly captures the *next* screening rules (the
calculus one_of) as its branches. ENVS 25 is also not recorded as a course.
Smallest correct representation: a `category_count`/`needs_review` rule (or
`one_of` [ENVS 25] with the unenumerated politics-course alternative as a
constraint note).
