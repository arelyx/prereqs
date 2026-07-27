# art-design-games-playable-media-ba — verification failures

## Section: Lower-Division Courses — History of Art and Visual Culture Requirement

**What the page says** (rendered snapshot):

```
[h5 sc-level-3] History of Art and Visual Culture Requirement
  P: Complete any one 5-credit History of Art and Visual Culture (HAVC) course. This can be either a lower- or upper-division course.
```

**What the JSON has**: `"op": "info"`, `"n": null`, `"courses": []` — the prose
is kept only in `source.prose`. `info` denotes advisory/policy prose that is
never required, so a genuine one-course degree requirement is dropped from the
machine-readable requirements.

**Smallest correct representation**: `category_count`, `n: 1`,
`needs_review: true` (membership genuinely unenumerated — any 5-credit HAVC
course, lower- or upper-division).

## Section: Lower-Division Courses — Lower-Division Arts Elective

**What the page says**:

```
[h5 sc-level-3] Lower-Division Arts Elective
  P: Complete one lower-division course from the following:
    * ART 10D
    ... (39 courses) ...
    * THEA 80Z
```

**What the JSON has**: `"op": "list"`, `"n": null`. `list` is a pool drawn from
by a counting parent, but no rule in this section carries
`from_following_lists`/a count, so the required "complete one course" pick is
not counted anywhere.

**Smallest correct representation**: `one_of` (or `n_of` with `n: 1`) over the
same 39-course list. (The course membership itself matches the page exactly.)

## Section: Transfer Admission Screening Policy (qualification)

**What the page says**:

```
  P: Complete one course or its equivalent from each of the following areas:
[h5 sc-level-3] Intro to 2D Concepts
    * ART 10D ... ARTG 91  (6 courses)
[h5 sc-level-3] Intro to 3D Concepts
    * ART 10E ... CMPM 26  (7 courses)
[h5 sc-level-3] Art and Design Topics
    * ART 10F ... THEA 30  (17 courses)
```

i.e. one course from EACH of the three areas — three courses total.

**What the JSON has**: a parent rule `"op": "n_of"`, `"n": 1`,
`"from_following_lists": true` over the three `list` children. Per the schema,
that means one course total drawn from the union of the lists — undercounting
the screening requirement (1 instead of one per area).

**Smallest correct representation**: parent as `info` (prose retained); each of
the three area rules as `one_of` over its own courses.

## Section: Upper-Division Courses — Upper-Division Electives (secondary)

**What the page says**:

```
  P: Complete four-upper division electives. Electives may be chosen from ARTG 100-189 courses, additional courses from the topic areas above, or from the courses listed below.
```

**What the JSON has**: `n_of`, `n: 4`, `from_following_lists: true` over only
the explicitly listed courses. The `ARTG 100-189` range (and the
topic-area-course option) survives only in `source.prose`; no `range` filter is
attached, so eligible ARTG 100-189 courses not in the printed list are excluded
from the pool.

**Smallest correct representation**: keep `n_of`, `n: 4`, and add a companion
`range` pool (include `ARTG 100-189`) plus the topic-area lists to the pools
drawn from (or a note-backed constraint if range pooling is not available at
this position).
