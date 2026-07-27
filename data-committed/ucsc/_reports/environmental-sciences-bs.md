# Verification report: environmental-sciences-bs

## Discrepancy 1 — Upper-Division electives: range filter contradicts the prose

**Section title:** Upper-Division Courses / "At least five elective courses."

**What the page says (rendered lines):**

> [h5 sc-level-3] At least five elective courses.
> P: Students take five upper-division Earth sciences, ocean sciences, and/or environmental sciences courses of 5 credits or more, chosen from EART 100-199 (excluding EART 196B and 198), OCEA 100 -199, and/or ESCI (100-189). No more than one quarter of EART 199 or OCEA 199 may be used as an elective. Lecture/lab combinations count as one course. If a lecture has a lab offered (required or optional), the lab must be passed to count for this requirement.

Eligible pool: EART 100-199 (minus EART 196B and EART 198), plus
OCEA 100-199, plus ESCI 100-189.

**What the JSON has:**

```json
"filter": {
 "exclude_codes": ["EART196B"],
 "exclude_ranges": [{"hi": 199, "lo": 100, "subject": "OCEA"}],
 "include_ranges": [{"hi": 199, "lo": 100, "subject": "EART"}],
 "include_series": []
}
```

Three errors versus the prose:

1. OCEA 100-199 is EXCLUDED instead of included — the opposite of the page.
2. The ESCI 100-189 include range is missing entirely.
3. EART 198 is missing from `exclude_codes` (page excludes both EART 196B
   and EART 198).

**Smallest correct representation:**

```json
"filter": {
 "exclude_codes": ["EART196B", "EART198"],
 "exclude_ranges": [],
 "include_ranges": [
  {"hi": 199, "lo": 100, "subject": "EART"},
  {"hi": 199, "lo": 100, "subject": "OCEA"},
  {"hi": 189, "lo": 100, "subject": "ESCI"}
 ],
 "include_series": []
}
```

(n=5 is correct. The EART 199/OCEA 199 one-quarter cap, lecture/lab rule,
and ENVS 115A+115L / METX 150 / ECE 180J allowances are carried as
constraint/prose text, which is an accepted approximation. All other
sections — qualification, lower-division options, ESCI core all_of, DC
options, comprehensive section_choice — match the page.)
