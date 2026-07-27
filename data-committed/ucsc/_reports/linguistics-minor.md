# linguistics-minor — verification failures

## Upper-Division Electives — range filter excludes courses the page allows

**Page says**:

```
[h4 sc-level-2] Upper-Division Electives
  P: The minor requires three 5-credit courses chosen from LING 100-189 and/or LING 200-289.
  P: The three courses may be any blend of these two options. As noted above, students may not apply both LING 111 and LING 112 toward the minor . ...
```

**JSON has**: `"op": "range"`, `"n": 3` with include_ranges LING 100-189 and
LING 200-289 (correct), but also
`"exclude_codes": ["LING111", "LING112"]`. The page does not exclude these
courses from the elective pool; it only bans applying *both* LING 111 and
LING 112 toward the minor (and its phrasing in this section implies either
one may individually count as an elective). Unconditionally excluding both is
over-restrictive and does not match the prose.

**Smallest correct representation**: the same range rule with
`"exclude_codes": []` and the pair ban carried as a constraint/note
("Students may not apply both LING 111 and LING 112 toward the minor"),
exactly as the "Take two of the following courses" rule already does.

Correct elsewhere: lower-division all_of (LING 50, LING 53); n_of 2 of the
five listed upper-division courses with the 111/112 ban as a note; Course
Substitution Policy carried as info.
