# latin-american-and-latino-studies-ba — verification failures

## 1. Senior Seminar recorded as `info` in both the base major and the concentration

**Page says** (rendered source, base major):

```
[h5 sc-level-3] Senior Seminar
  P: All students complete one senior seminar (LALS 194 A-Z, excluding L) and seminar lab ( LALS 194L ). This requirement satisfies the Comprehensive Requirement.
```

and for the Language Intensive Concentration:

```
[h4 sc-level-2] Senior Seminar
  P: The Comprehensive Requirement is fulfilled by completing one senior seminar (LALS 194 A-Z, excluding L) and seminar lab ( LALS 194L ).
```

**JSON has**: both Senior Seminar rules are `"op": "info"` with no courses/filter — the
required seminar + lab pair is dropped from the machine representation. The
Comprehensive Requirement rules (also `info`) point at this seminar, so nothing enforces
it anywhere.

**Smallest correct representation**: per variant, a `range` rule with `n: 1` over the
LALS 194 series excluding LALS 194L, plus `all_of` ["LALS194L"] (or one rule combining
series-choice + required lab), keeping "satisfies the Comprehensive Requirement" as a
note.

## 2. DC Requirement rules unresolved (`op: "unknown"`) in both variants

**Page says** (identical structure in both variants):

```
[h4 sc-level-2] Disciplinary Communication (DC) Requirement
  P: ... The DC requirement for the Latin American and Latino Studies B.A. is met by completing:
    * LALS 100A
    * LALS 100L
```

**JSON has**: `"op": "unknown"`, `needs_review: true`, courses ["LALS100A", "LALS100L"]
— an unresolved rule where the page states a plain conjunction.

**Smallest correct representation**: `"op": "all_of"` with courses ["LALS100A",
"LALS100L"], `needs_review: false`.

## 3. Concentration "LALS Core Courses" unresolved (`op: "unknown"`)

**Page says** (Language Intensive Concentration):

```
[h4 sc-level-2] LALS Core Courses
    * LALS 100
    * LALS 100A
    * LALS 100L
```

A bare required list (the base major's identical section is correctly `all_of`).

**JSON has**: `"op": "unknown"`, `needs_review: true`, courses ["LALS100", "LALS100A",
"LALS100L"].

**Smallest correct representation**: `"op": "all_of"` over the three courses.
