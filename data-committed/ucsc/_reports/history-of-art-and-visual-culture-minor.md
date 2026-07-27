# FAIL report: history-of-art-and-visual-culture-minor

Both requirement sections are the entire content of the minor (nine required
courses), but each is encoded as `"op": "info"` — advisory prose that is never
required. As committed, the JSON imposes zero requirements. The stated counts
(three, six) are not represented by any operator.

## 1. Lower-Division Courses — required count of three dropped to `info`

**Page says**:

```
==== H2: Course Requirements
  P: The HAVC minor requires three lower-division and six upper-division courses
     for a total of nine courses.
[h3 sc-level-1] Lower-Division Courses
  P: Three lower-division courses, each from a different geographic region
     listed below:
  LI: HAVC courses 10-19: Africa and its Diaspora
  LI: HAVC courses 20-29: Asia and its Diaspora
  LI: HAVC courses 30-49: Europe and the Americas
  LI: HAVC courses 50-59: Mediterranean
  LI: HAVC courses 60-69: Native Americas
  LI: HAVC courses 70-79: Oceania and its Diaspora
  P: HAVC 80 may be used to fulfill a lower-division requirement for one of the
     following geographic regions: 10s (Africa), 60s (Native Americas), or 70s
     (Oceania).
```

Three courses required, each from a different geographic region (regions defined
by HAVC number ranges).

**JSON has**: `"op": "info"` with the prose in `source.prose`; no count, no
membership.

**Smallest correct representation**: `category_count` with n=3 over the
region-defined (genuinely unenumerated) membership, `needs_review: true`, with
the "each from a different region" / HAVC 80 rider carried as a constraint.

## 2. Upper-Division Courses — required count of six dropped to `info`

**Page says**:

```
[h3 sc-level-1] Upper-Division Courses
  P: Six upper-division courses. These are HAVC courses numbered 100-191.
```

**JSON has**: `"op": "info"`; no count, no range.

**Smallest correct representation**: an `n_of` (n=6) over a `range` filter for
HAVC 100-191 (equivalently `category_count` n=6).
