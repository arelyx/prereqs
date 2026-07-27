# network-and-digital-technology-ba — verification failures

## Section: Five additional upper-division or graduate electives — pool mis-defined by advisory "focus" lists

**What the page says**:

```
[h4 sc-level-2] Five additional upper-division or graduate electives
  P: Five additional 5-credit or more, upper-division electives ... are required.
     ... Students may use the following lists to focus their studies in a
     particular area.
  LI: Any 5-credit or more CSE course with a number between 100 and 189, except
      for the DC courses CSE 115A and CSE 185E /CSE 185S. ...
  LI: Any 5-credit or more CSE course with a number between 201 and 279. ...
  LI: CSE 195 (if not used to satisfy the DC).
  LI: Any course from the additional approved electives list .

[h5 sc-level-3] Digital Technology for Networking Focus
  P: Students wishing to focus on digital technology for networking should
     consider including among their courses the following ...
    (CSE 118, 151, 151L, 156, 156L, 157, 167, 183)

[h5 sc-level-3] Internet Software Technology Focus
  P: Students wishing to focus on Internet software technology should consider
     including among their courses the following:
    (CSE 115A, 117, 119, 130, 165, 180, 181, 182, 186, 187)
```

The five-elective pool is the four range/list bullets (any CSE 100-189 except
CSE 115A / 185E / 185S, any CSE 201-279, CSE 195, and the approved-electives
list). The two "Focus" sections are explicitly advisory ("should consider
including among their courses"), not the defining pool.

**What the JSON has**: the counting parent is `"op": "n_of"`, `"n": 5`,
`"from_following_lists": true`, `courses: []`, and the two Focus sections are
each `"op": "list"` (18 enumerated courses total). Because the n=5 parent draws
`from_following_lists`, the machine pool is effectively those 18 advisory
courses. This (a) mislabels advisory "should consider" content as a required
pool, and (b) understates the true membership — a valid elective such as any
other CSE 100-189 course not in a Focus list would be wrongly rejected.

**Smallest correct representation**: model the elective requirement as a
`range`/`category_count` (n=5, `needs_review: true`) over CSE 100-189 (exclude
CSE 115A, CSE 185E, CSE 185S), CSE 201-279, and CSE 195, with the
approved-electives list as an unenumerated rider; and represent the two Focus
groupings as `info` (advisory), not as `list` pools feeding the count.
