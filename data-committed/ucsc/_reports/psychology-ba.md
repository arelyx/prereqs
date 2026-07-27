# psychology-ba — verification failures

## Concentration attribution (General vs. Intensive)

**What the page says**: two separate requirement blocks under distinct H2s —
"General Psychology Major" and "Intensive Psychology Major" (the page calls
the latter the "Intensive concentration").

**What the JSON has**: both blocks' sections (two each of Course
Requirements, Lower-Division Courses, Upper-Division Courses, DC,
Comprehensive) all have `"concentration": null`. The Intensive major's rules
are indistinguishable from the General major's — a consumer sees duplicate,
conflicting section sets with no attribution.

**Smallest correct representation**: set `"concentration": "Intensive
Psychology Major"` (and optionally "General Psychology Major") on the
respective sections, as done for e.g. the accounting concentration in
business-management-economics-ba.

## Sections: Upper-Division Courses (both majors) — subfield counts

**What the page says**:

```
[h5 sc-level-3] One course in each of the following subfields (three courses):
  LI: Developmental (courses numbered PSYC 101- PSYC 119A -Z)
  LI: Cognitive (courses numbered PSYC 120 -PSYC 139A-Z)
  LI: Social (courses numbered PSYC 140- PSYC 159A -Z)

[h5 sc-level-3] One additional 5-credit upper-division course from THREE of the subfields listed below (i.e., a total of three courses, each from a separate subfield):
  LI: Developmental ... Cognitive ... Social ... Clinical-Personality ( PSYC 160 - PSYC 179A -Z) ... Methods (PSYC 180-PSYC 189) ... Independent Study ( PSYC 193 - PSYC 199 )
```

Each rule requires three courses.

**What the JSON has**: both rules (in both the General and Intensive
upper-division sections) are `"op": "category_count"` with `"n": 1` and
`needs_review: false`. The stated count "(three courses)" is not matched —
six of the major's upper-division courses are undercounted to two.

**Smallest correct representation**: `category_count` with `"n": 3` (or three
per-subfield n=1 rules for the first), `needs_review: true`; the PSYC number
ranges could alternatively be carried as `range` filters/series.

## Section: Major Qualification — Mathematics requirement

**What the page says**:

```
[h5 sc-level-3] One of the following courses
[h6 sc-level-4] Mathematics requirement
    * AM 3 ... * MATH 19A   (8 courses)
  NOTE: May also be satisfied with a score of 300 or higher on the ALEKS Mathematics Placement.
```

**What the JSON has**: the section_choice's only child, "Mathematics
requirement", is `"op": "unknown"`, `"n": null`, `needs_review: true`.
`unknown` is not a valid operator; the page determines it (one of the eight
listed courses). The identical list in Lower-Division Courses is correctly
`one_of`.

**Smallest correct representation**: `"op": "one_of"` over the same eight
courses with the ALEKS note retained, `needs_review: false`.

## Section: Intensive Upper-Division — "Two quarters of study from one of the following"

**What the page says**:

```
[h5 sc-level-3] Two quarters of study from one of the following:
    * PSYC 193 ... * PSYC 193S   (10 courses)
  NOTE: PSYC 193I is equivalent to two quarters of field study and will satisfy the Advanced Requirement in its entirety.
```

**What the JSON has**: `"op": "one_of"` (one course) over the 10 courses —
undercounting the stated two quarters.

**Smallest correct representation**: `n_of`, `n: 2` (repeat quarters counted
as distinct picks is the in-scope approximation), keeping the PSYC 193I
equivalence note.

## Secondary notes

- Transfer screening "Recommended Prior to Transfer" (PSYC 10/PSYC 20,
  "Though not required...") is encoded as a required `all_of`; recommended
  content should be `info`.
- "One upper-division course outside of psychology" is `one_of` over only the
  15 explicitly listed courses; the primary membership (any 5-credit UD
  course numbered 100-189 in 15 named departments) survives only as
  constraint prose. A `category_count`/`range`-style representation would
  capture it; as encoded the rule excludes most qualifying courses.
