# history-ba — verification failures

## Track/concentration attribution (whole file)

**What the page says**: two separate requirement tracks, each under its own
H2 heading with its own full set of requirement sections:

```
==== H2: General History Major     (12 courses; Elective (1 Course); ...)
==== H2: Intensive History Major   (15 courses; Electives (4 Courses); Advanced Research Requirement; Language Requirement; ...)
```

**What the JSON has**: every section has `"concentration": null`. The file
contains two "Course Requirements", two "Breadth Requirements (4 Courses)",
two "Comprehensive Requirement" sections etc., with nothing distinguishing
which belongs to the General major and which to the Intensive major. A
consumer would read this as one program requiring both (e.g. 1 elective AND
4 electives).

**Smallest correct representation**: set `"concentration"` (e.g. "General
History Major" / "Intensive History Major") on each section, as done for
tracks in other multi-track programs.

## Sections: Region of Concentration — Lower-Division Survey lists (both tracks)

**What the page says**:

```
[h5] Lower-Division Survey (1 Course)
  P: At least one lower-division survey course within their chosen region of concentration. ...
[h6] Americas/Africa:  HIS 10A, HIS 10B, HIS 11A, HIS 11B, HIS 12, HIS 31A
[h6] Asia/Pacific:     HIS 40A, HIS 40B, HIS 44
[h6] Europe/Mediterranean World: HIS 31A, HIS 41, HIS 58, HIS 65B, HIS 70A, HIS 70B, HIS 74, HIS 74A, HIS 74B
```

**What the JSON has**: the three regional lists are rules with
`"op": "unknown"` and `needs_review: true` (in both the General and the
Intensive sections). `unknown` is not a valid operator in the schema
vocabulary; the choose-one-survey-in-your-region semantics is unrepresented.

**Smallest correct representation**: an `options`/`section_choice` over the
three regions, each branch a `one_of` of that region's survey courses (n=1
overall); membership as listed is correct.

## Sections: Comprehensive Requirement (both tracks)

**What the page says**:

```
[h5] Comprehensive Requirement
  P: One comprehensive requirement: All students must complete either a research seminar (HIS 190 series, HIS 194 series, or HIS 196 series), or a senior thesis ( HIS 195A and HIS 195B ) in their area of concentration. ...
```

(and the later standalone "Comprehensive Requirement" section repeats the
same two options.)

**What the JSON has**: only `info` rules — no machine-readable rule requires
the comprehensive at all, even though the page names concrete courses
(HIS 195A, HIS 195B) and series (HIS 190/194/196). `info` content is never
required, but this requirement is mandatory for every student.

**Smallest correct representation**: an `options` rule with two branches —
(a) one course from the HIS 190/194/196 series (a `range`/series filter or
`category_count` n=1 with needs_review), (b) `all_of` [HIS195A, HIS195B] —
with the in-concentration rider as a constraint. (The DC section may remain
`info` since it is satisfied by the same comprehensive.)

## Section: Advanced Research Requirement (Intensive track)

**What the page says**:

```
[h4] Advanced Research Requirement
  P: Three of the 15 courses required for the intensive major must require advanced historical research. Advanced research seminars (HIS 190 series, HIS 194 series, or HIS 196 series), the senior thesis ( HIS 195A and HIS 195B ) and/or independent studies ( HIS 199 ) ... may satisfy this requirement. ...
```

**What the JSON has**: an `info` rule with the text as a constraint — the
required count of **three** is not represented.

**Smallest correct representation**: `category_count`/`n_of` with `n: 3`
over the 190/194/196 series plus HIS 195A/HIS 195B/HIS 199 (needs_review
acceptable), keeping the in-concentration rider as a constraint.
