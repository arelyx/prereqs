# sustainability-studies-minor — verification failures

## Section: Capstone

### Choose-one-of-two-options structure not represented

Page says:

> [h3] Capstone
>   P: Students choose from one of the following options:
> [h4] Option 1: IDEASS Capstone
> [h5] Take the following course three times (9 credits total):
>     * CRSN 152
> [h4] Option 2: Breadth Capstone
>   P: Students fulfill the Breadth Capstone by taking one upper-division Breadth Elective and either an upper-division CRSN or additional upper-division Breadth Elective course from the lists below.

JSON has three sibling rules: the Capstone parent as `info`; Option 1 as an
unconditional `"op": "all_of", "courses": ["CRSN152"]`; Option 2 as `info`.

Two problems: (a) the either/or structure is lost — as coded, CRSN 152 is
required of every student rather than being one of two alternatives; (b)
Option 2's requirement (one Breadth Elective plus one more CRSN-or-Breadth
course) is carried only as non-required `info`, so it is dropped.

Smallest correct representation: a `section_choice` over two subrules —
(1) CRSN 152 (with the taken-three-times rider as a note; counting it as one
distinct course is an allowed repeatability approximation), and (2) a
two-course rule drawing one course from the Breadth Electives list plus one
from the CRSN or Breadth lists (n_of/category_count with the lists
referenced and the no-double-count rider as a constraint).

## Section: Upper-Division Elective

### Required one-course elective coded as non-required `info`

Page says:

> [h3] Upper-Division Elective
>   P: All students must take one 5-credit course from the CRSN or Breadth Electives lists below. The upper-division elective does not count toward the Breadth Capstone requirement. ...

JSON has `"op": "info"`, `"n": null`. The requirement (n=1 from the CRSN
Electives + Breadth Electives pools) is dropped from the structured
representation.

Relatedly, the Breadth Electives list rule is coded
`"op": "n_of", "n": 1, "from_following_lists": true` — but on the page that
list is a shared pool serving both the Upper-Division Elective and the
Breadth Capstone (the page note says "The list of breadth elective courses
applies to all of the upper-division options above"); n=1 does not belong on
the list itself, and as written it also cannot be satisfied by the CRSN
Electives list (e.g. CRSN 155S), which the elective requirement allows.

Smallest correct representation: an `n_of` with `"n": 1` and
`from_following_lists` on the Upper-Division Elective rule, with the CRSN
Electives and Breadth Electives rules both as plain `list` pools (the CRSN
list is already `list`), and the does-not-double-count-toward-capstone rider
as a constraint.

Other rules (CRSN 55 twice as all_of — allowed repeatability approximation —
and the CRSN 151A/151B/151C core all_of; Breadth list membership itself)
match the page.
