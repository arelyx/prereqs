# Verification report: computer-engineering-bs

## Discrepancy 1 — Concentration rules not attributed to their concentrations

**Section titles:** Computer Systems Concentration Requirements; Digital
Hardware Concentration Requirements; Networks Concentration Requirements;
System Programming Concentration Requirements

**What the page says (rendered lines):**

> [h3 sc-level-1] Concentration Courses
> P: All students complete the core courses, disciplinary communication (DC), and comprehensive requirements listed above, In addition to these courses, students must complete all courses listed within their selected concentration below.
> [h4 sc-level-2] Computer Systems Concentration Requirements ...
> [h4 sc-level-2] Digital Hardware Concentration Requirements ...
> [h4 sc-level-2] Networks Concentration Requirements ...
> [h4 sc-level-2] System Programming Concentration Requirements ...

Each h4 block is a distinct concentration; a student completes the courses
of ONE selected concentration.

**What the JSON has:**

All four concentration requirement sections have `"concentration": null`
(with `"kind": "concentration"`). The corpus convention (see
earth-sciences-bs, applied-physics-bs, history-of-art-and-visual-culture-ba)
is that concentration-specific sections carry the concentration name in the
`concentration` field; `null` means the section applies to all students.
With `null` on all four, the rules are not attributed to any concentration
and read as if every student must complete all four packages.

**Smallest correct representation:**

Set the `concentration` field on each of the four sections:

```json
"concentration": "Computer Systems Concentration"
"concentration": "Digital Hardware Concentration"
"concentration": "Networks Concentration"
"concentration": "System Programming Concentration"
```

(The two shared info sections — "Course Requirements (all concentrations)"
and "Concentration Courses" — correctly stay `null`. The rules inside each
concentration section otherwise match the page: memberships, one_of/all_of/
options operators, and category_count electives are all correct.)
