# FAIL report: latin-american-and-latino-studiessociology-combined-ba

## 1. Comprehensive Requirement — real requirement dropped to `info`

**Page says**:

```
[h4 sc-level-2] Comprehensive Requirement
  P: Students satisfy the Comprehensive Requirement by completing either an LALS
     Senior Seminar (LALS 194 A-Z, excluding L) and LALS 194L , or complete
     SOCY 196S . Topics in SOCY 196S vary. Students interested in the SOCY 196S
     option will need to apply in advance .
```

A genuine exit requirement: choose one of two options — (LALS 194 seminar +
LALS 194L) OR SOCY 196S.

**JSON has**: `"op": "info"` (advisory / never required); the choice and the
courses are not represented.

**Smallest correct representation**: an `options` (or `section_choice`) rule with
two branches — branch 1 = `all_of` [a LALS 194 A-Z seminar (excl. L), LALS 194L],
branch 2 = [SOCY 196S] — with the LALS 194 A-Z membership carried as a
range/category rider.

## 2. Upper-Division "Four Upper-Division Elective Courses" — 2-LALS + 2-Sociology split lost

**Page says**:

```
[h5 sc-level-3] Four Upper-Division Elective Courses
  P: Choose two 5-credit upper-division LALS electives (numbered 101-190) and
     two 5-credit upper-division sociology electives (numbered 110-189).
```

Specifically two from LALS 101-190 AND two from SOCY 110-189.

**JSON has**: a single `"op": "category_count", "n": 4` (the split and the two
ranges survive only in `source.prose`). This is satisfiable by, e.g., four LALS
electives, which the page disallows.

**Smallest correct representation**: two `category_count`/range rules —
n=2 over LALS 101-190 and n=2 over SOCY 110-189.
