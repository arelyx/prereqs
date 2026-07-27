# robotics-engineering-bs — verification failures

## 1. Lower-Division Courses — four "either" choices typed as all_of

**Page says**:

```
[h5 sc-level-3] Either of the following:
    * AM 10
    * MATH 21
[h5 sc-level-3] Either of the following:
    * AM 20
    * MATH 24
[h5 sc-level-3] And either of the following:
    * MATH 23A
    * AM 30
[h5 sc-level-3] And either of the following:
    * ECE 13
    * CSE 13S
```

**JSON has**: all four rules with `"op": "all_of"`, which would require both
courses of each pair.

**Smallest correct representation**: `"op": "one_of"` for each of the four
pairs. (Compare the Major Qualification section of the same file, where the
identical pairs are correctly `one_of`.)

## 2. Upper-Division Courses — "And either of the following: CSE 107 / STAT 131"

**Page says**:

```
[h5 sc-level-3] And either of the following:
    * CSE 107
    * STAT 131
```

**JSON has**: `"op": "all_of"` over [CSE107, STAT131].

**Smallest correct representation**: `"op": "one_of"`.

## 3. Electives — counts unrepresented

**Page says**: "Advanced Robotics Elective — One of the following:" (10
graduate ECE courses) and "Upper-Division and Graduate Elective — One course
from the following:" (35 courses).

**JSON has**: both rules with `"op": "list"`, `"n": null` and no counting
parent, so the stated count of one for each is unrepresented.

**Smallest correct representation**: `"op": "one_of"` for each rule
(lecture+lab-counts-as-one rider stays a note).

Correct elsewhere: transfer screening (n_of 7 over the following lists, an
in-scope screening representation; AM 10 duplicated exactly as on the page),
major qualification rules, the CSE 12/20/30 and nine-course lower-division
all_of rules with PHYS 15A/15C substitution prose, the 11-course
upper-division all_of with the ECE 218 petition note, and the DC and
Comprehensive capstone options ([ECE129A,B,C] vs [ECE129A, ECE195, ECE195]
with the 10-credit note) all match the page.
