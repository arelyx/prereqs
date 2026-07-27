# art-ba — verification failures

## Section: Lower-Division Courses — Critical Theory and Historical Context

### Required 2-course HAVC requirement coded as `info`

Page says:

> P: Students complete two courses from the History of Art and Visual Culture (HAVC) geographic regions:
> P: One course from Europe and the Americas: HAVC courses numbered 30-49 or 130-149
> P: One course from Africa, Asia, Mediterranean, Native Americas, or Oceania : HAVC courses numbered 10-29, 50-80, 110-129, or 150-179.

JSON has:

```json
"op": "info", "n": null, "courses": []
```

`info` means advisory/policy prose that is never required, but this is a
required part of the eight lower-division courses ("Students complete eight
courses as follows"): two courses with fully stated range membership. The
count of 2 and the HAVC number ranges are not recorded anywhere machine-readable.

Smallest correct representation: two `range` rules (n=1 each), one with
include ranges HAVC 30-49 and 130-149, the other with include ranges
HAVC 10-29, 50-80, 110-129, and 150-179 (AP-exam substitution kept as a note).

## Section: Upper-Division Courses — Studio Work

### Required 7-course studio requirement coded as `info`

Page says:

> P: Students take seven upper-division studio courses. These include courses numbered ART 101 — ART 189 , ART 190B , ART 194 , ART 196 , ART 198 , and ART 199 . ART 190B satisfies both an upper-division studio as well as the comprehensive requirement.

JSON has:

```json
"op": "info", "n": null, "courses": []
```

This is the core upper-division requirement (7 of the 8 upper-division
courses; the eighth is ART 190A under DC). Coding it as `info` drops both the
count of 7 and the eligible-course membership.

Smallest correct representation: a `range` rule with `"n": 7`, filter
including the range ART 101-189 plus include codes ART 190B, ART 194,
ART 196, ART 198, ART 199.

## Section: Comprehensive Requirement — "Plus one of the following options:"

### Four-way option list collapsed to a single required course

Page says:

> LI: Presenting an exhibition and, by appointment, meeting with a faculty member for review and critique of the exhibition; or
> LI: Submitting a portfolio and, by appointment, meeting with a faculty member for review and critique of the portfolio; or
> LI: Enrolling in an upper-division studio (ART 100-199) course with a faculty member and completing an additional project; or
> LI: Completing the following course:
>     * ART 190B

JSON has:

```json
"op": "one_of", "courses": ["ART190B"]
```

A `one_of` over the singleton [ART190B] makes ART 190B mandatory, but the
page offers three non-course alternatives (exhibition review, portfolio
review, or an additional project in any upper-division studio); ART 190B is
only one of four ways to satisfy the option.

Smallest correct representation: an `options` rule with four branches (three
non-course branches carried as notes/needs_review or `category_count`-style
manual checks, plus one branch requiring ART 190B).
