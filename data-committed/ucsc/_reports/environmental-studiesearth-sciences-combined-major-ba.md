# environmental-studiesearth-sciences-combined-major-ba — verification failures

## Section: Electives / "Three upper-division environmental studies courses" — wrong pool (rider list used as the whole pool; ENVS 101–179 range dropped)

**Page says** (rendered snapshot):

```
[h5 sc-level-3] Three upper-division environmental studies courses
  P: Of the three required upper-division environmental studies electives
     (numbered ENVS 101- ENVS 179 ), at least one must be taken from the
     following list of social science electives:
    * ENVS 110
    * ENVS 130B /LGST 130B
    ... (19 courses total) ...
    * ENVS 178
```

The requirement is **three courses from ENVS 101–179** (a range), of which
**at least one** must come from the 19-course social-science list. The list
is a rider on a broader pool, not the pool itself.

**What the JSON has**: a single rule `"op": "n_of"`, `"n": 3` whose `courses`
are exactly the 19 social-science courses. This misrepresents the
requirement two ways:
- The pool is restricted to the 19 listed courses; every other
  ENVS 101–179 upper-division course (which may legitimately count toward
  two of the three) is missing.
- The "at least one from the social-science list" rider is lost entirely
  (it collapses into "all three from the list").

A student taking, e.g., ENVS 101 + ENVS 105 + ENVS 110 satisfies the page
(one from the list) but fails the committed rule (101, 105 not in the pool).

**Smallest correct representation**: a counting rule over the ENVS 101–179
range with the rider kept as a constraint/note —

```json
{"op": "range", "n": 3,
 "filter": {"subject": "ENVS", "include": [[101, 179]]},
 "constraints": [{"type": "prose",
   "text": "at least one must be from the social-science elective list (ENVS 110, ENVS 130B, ... ENVS 178); none may be an internship/individual-study/substitution course"}]}
```

(This mirrors how the sibling "Three upper-division Earth sciences courses"
rule in this same section is correctly carried as `category_count` n=3 over
the EART 100–191C range.)
