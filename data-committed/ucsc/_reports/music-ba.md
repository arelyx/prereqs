# music-ba — verification failures

## 1. Compositional Practices — History/Culture Elective (kind `electives`)

**Page says**: "Students must take one course from the MUSC 101, Foundational
History/Culture, or MUSC 105, Topical History, series to fulfill their
upper-division elective." followed by 20 listed courses.

**JSON has**: `"op": "list"`, `"n": null` with no counting parent, so the
stated count of one is unrepresented.

**Smallest correct representation**: `"op": "one_of"` over the same 20
courses (graduate-seminar substitution kept as a note). Membership itself is
correct (MUSC 105S/MUSC 253S carried as primary code).

## 2. Modular Requirements represented as advisory info (both Compositional Practices and Global Musics)

**Page says** (CP; GM is parallel): "students pursuing the ... concentration
are required to complete three modules", and "Each module consists of: a
lower-division MUSC 11, MUSC 80, or MUSC 81-series course ... (three total);
an upper-division MUSC 150 or equivalent ... (three total); two quarters of
performing ensembles or performance practice workshops ... (six total)".

**JSON has**: a single `"op": "info"` rule per concentration. A required
12-course block (3 + 3 + 6, with stated counts) is represented as advisory
prose with `needs_review: false`.

**Smallest correct representation**: `category_count` rules with the stated
ns (3, 3, 6) and `"needs_review": true`, since module membership is genuinely
unlisted on the page (department website); plain `info` drops the requirement.

## 3. Global Musics — Elective Upper-Division Lectures/Seminars

**Page says**: "Take three (3) lectures or seminars from the upper-division
music catalog." followed by the 41-course list.

**JSON has**: parent `info` plus a child rule with `"op": "unknown"`,
`"n": null`, `"needs_review": true`. The stated count of three is not
represented.

**Smallest correct representation**: `"op": "n_of"`, `"n": 3` over the listed
pool (double-count rider as a note).

## 4. Global Musics — Comprehensive Requirement is not represented as a choice

**Page says**: the capstone is satisfied by option A) one Research Project
course taken concurrently with MUSC 195A, **or** B) one Creative Portfolio
course taken concurrently with MUSC 196A.

**JSON has**: four sibling rules all in force — one_of (research pool),
all_of [MUSC195A], one_of (portfolio pool), all_of [MUSC196A] — which reads
as requiring both options.

**Smallest correct representation**: `"op": "section_choice"` (or options)
between two branches: {one research course + MUSC 195A} and {one portfolio
course + MUSC 196A}.

## 5. Western Music — Final Upper-Division Elective

**Page says**: fulfilled by "One additional class from the MUSC 150 series,
not already taken; One additional class from the MUSC 101 series, not already
taken; OR One of the courses listed below: MUSC 121B, MUSC 122, MUSC 123B".

**JSON has**: `"op": "list"`, `"n": null` over only [MUSC121B, MUSC122,
MUSC123B] — the MUSC 150-series and MUSC 101-series alternatives are dropped
and the count of one is unrepresented.

**Smallest correct representation**: an options/range rule with three
branches (MUSC 150-series course, MUSC 101-series course, or one_of the three
listed), or `category_count` n=1 with `needs_review: true` and the
alternatives as notes.

## 6. Western Music — Performing Ensembles

**Page says**: "students are expected to complete six quarters of performing
ensembles on their primary instrument or voice" from the 20-course list (max
one ensemble per quarter).

**JSON has**: `"op": "unknown"`, `"n": null`, `"needs_review": true` — the
stated count of six is unrepresented.

**Smallest correct representation**: `"op": "n_of"`, `"n": 6` over the listed
ensembles (repeatability treated as six quarters, an in-scope approximation;
one-per-quarter cap as a note).

## 7. Western Music — Individual Applied Lessons

**Page says**: "students are expected to complete six quarters of applied
lessons on their primary instrument or voice", choosing appropriate courses
(with instructor guidance) from MUSC 61, MUSC 62, MUSC 161, MUSC 161A,
MUSC 162, MUSC 196B.

**JSON has**: `"op": "all_of"` over all six courses, which would require every
listed lesson course rather than six quarters of appropriate ones.

**Smallest correct representation**: `"op": "n_of"`, `"n": 6` over the pool
(quarters-as-courses approximation), with the advising prose as notes.

## 8. Western Music — Comprehensive Requirement drops an alternative

**Page says**: "students may either take an additional MUSC 105-series
course, not already taken, or the following course: MUSC 120".

**JSON has**: `"op": "all_of"` [MUSC120] only; the MUSC 105-series
alternative exists only in source prose, so MUSC 120 appears strictly
required.

**Smallest correct representation**: an options/range rule with two branches
(one additional MUSC 105-series course, or MUSC 120), or `category_count`
n=1 `needs_review: true` with the alternative as a note.

Correct elsewhere: CP and GM lower-division theory/musicianship rules
(placement bypass and MUSC 31 repeat policy as prose), CP MUSC 120
twice-rider as constraint, CP composition/analysis one_of, MUSC 101C, both
Elective Ensembles n_of 3 rules, GM Graduate-Level Research one_of, all three
DC one_of rules, CP comprehensive (MUSC 196A), and the Western Music
lower-division and history/theory n_of and one_of rules all match the page.
