# Verification report: history-minor

## Discrepancy 1 — Lower-Division Courses: requirement encoded as info

**Section title:** Lower-Division Courses

**What the page says (rendered lines):**

> [h3 sc-level-1] Lower-Division Courses
> P: Three 5-credit lower-division (HIS 1– HIS 99 ) and/or 5-credit upper-division ( HIS 100 – HIS 199 ) history courses.

A required count (three) drawn from an enumerable range (HIS 1-199).

**What the JSON has:**

`"op": "info"` with empty `courses`, no filter, `"n": null`. `info` means
advisory/never-required, so the requirement disappears; the stated count
of 3 is not represented.

**Smallest correct representation:**

```json
"op": "range",
"n": 3,
"filter": {
 "exclude_codes": [], "exclude_ranges": [],
 "include_ranges": [{"hi": 199, "lo": 1, "subject": "HIS"}],
 "include_series": []
}
```

## Discrepancy 2 — Upper-Division Courses: requirement encoded as info

**Section title:** Upper-Division Courses

**What the page says (rendered lines):**

> [h3 sc-level-1] Upper-Division Courses
> P: Five 5-credit upper-division ( HIS 100 – HIS 199 ) history courses.

**What the JSON has:**

`"op": "info"` with empty `courses`, no filter, `"n": null` — the five-course
requirement is not represented.

**Smallest correct representation:**

```json
"op": "range",
"n": 5,
"filter": {
 "exclude_codes": [], "exclude_ranges": [],
 "include_ranges": [{"hi": 199, "lo": 100, "subject": "HIS"}],
 "include_series": []
}
```

(Also note: the H2 preamble "Eight history courses are required, five of
which must be 5-credit upper-division courses ... up to two of their minor
courses for pass/no pass" is not captured anywhere — with correct range
rules the eight-course total and P/NP rider could ride along as
constraints/notes text, which would be an accepted approximation.)
