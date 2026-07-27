# FAIL report: technology-and-information-management-bs

Lower-division, upper-division, electives (category_count n=2 BE electives +
category_count n=1 economics), and DC (TIM 175) all match the page. The single
failure is the Comprehensive Requirement.

## Comprehensive Requirement — all five courses required, but encoded as n_of n=2

**Page says**:

```
[h4 sc-level-2] Comprehensive Requirement
  P: Students complete the comprehensive requirement in two areas, the
     management of technology and the technology of management. The
     comprehensive requirement in the management of technology consists of two
     five-credit courses, TIM 172A and TIM 172B, and two three-credit project
     courses, TIM 172P and TIM 172Q. ... The comprehensive requirement in the
     technology of management consists of a five-credit project-intensive
     course, TIM 175.
    * TIM 172A
    * TIM 172B
    * TIM 172P
    * TIM 172Q
    * TIM 175
```

All five courses are required (four for management-of-technology plus TIM 175 for
technology-of-management); the "two areas" are both mandatory, not a choose-two.

**JSON has**:

```json
{"op": "n_of", "n": 2, "courses": ["TIM172A","TIM172B","TIM172P","TIM172Q","TIM175"]}
```

This requires only any 2 of the 5, which drastically understates the
requirement.

**Smallest correct representation**:

```json
{"op": "all_of", "courses": ["TIM172A","TIM172B","TIM172P","TIM172Q","TIM175"]}
```
