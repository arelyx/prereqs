# Verification report: earth-sciences-minor

## Discrepancy 1 — Upper-Division Courses: OCEA 100-199 excluded instead of included

**Section title:** Upper-Division Courses

**What the page says (rendered lines):**

> [h3 sc-level-1] Upper-Division Courses
> P: Students take five upper-division Earth sciences or ocean sciences courses of 5 credits or more, chosen from EART 100-199 (excluding EART 196B and EART 198 ) or OCEA 100 -199. No more than one quarter of EART 199 or OCEA 199 may be used as an elective. Lecture/lab combinations count as one course. If a lecture has a lab offered (required or optional), the lab must be passed to count for this requirement.

OCEA 100-199 is part of the eligible pool ("chosen from EART 100-199 ...
**or OCEA 100-199**").

**What the JSON has:**

The `range` rule's filter places OCEA in `exclude_ranges`:

```json
"filter": {
 "exclude_codes": ["EART196B", "EART198"],
 "exclude_ranges": [{"hi": 199, "lo": 100, "subject": "OCEA"}],
 "include_ranges": [{"hi": 199, "lo": 100, "subject": "EART"}],
 "include_series": []
}
```

This makes every OCEA 100-199 course ineligible, the opposite of the page.

**Smallest correct representation:**

Move the OCEA range from `exclude_ranges` to `include_ranges`:

```json
"filter": {
 "exclude_codes": ["EART196B", "EART198"],
 "exclude_ranges": [],
 "include_ranges": [
  {"hi": 199, "lo": 100, "subject": "EART"},
  {"hi": 199, "lo": 100, "subject": "OCEA"}
 ],
 "include_series": []
}
```

(n=5 is correct; the "no more than one quarter of EART 199 or OCEA 199"
and lecture/lab riders are properly carried as constraint/prose text.)
