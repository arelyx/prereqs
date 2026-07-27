# applied-mathematics-bs — verification failures

## Section: Upper-Division Electives

### 1. Elective count (n=3) lost; wrong operator on parent rule

Page says:

> P: Students are required to take three upper-division elective courses from the following list of possible electives. Up to one of these electives can be replaced by a 5-credit independent study to do research with one of the program faculty.

JSON has the parent rule as:

```json
"op": "section_choice", "n": null, "courses": []
```

`section_choice` means "choose one of the following subrules", which is not what
the page says, and the stated count of three is not recorded anywhere.

Smallest correct representation: parent rule with `"op": "n_of"`, `"n": 3`,
`"from_following_lists": true` (matching the pattern used for the
Lower-Division Electives section in this same file), with the independent-study
substitution kept as a constraint/note.

### 2. "Either of the following courses:" pairs coded as all_of

Page (under Possible EART Electives):

> [h6] Either of the following courses:
>     * EART 125
>     * EART 225
> [h6] Either of the following courses:
>     * EART 172 /OCEA 172
>     * EART 272 /OCEA 272

Page (under Possible OCEA Electives):

> [h6] Either of the following courses:
>     * OCEA 100
>     * OCEA 200
> [h6] Either of the following courses:
>     * OCEA 111
>     * OCEA 211

JSON codes all four of these rules as `"op": "all_of"`, i.e. both courses
required. The page says either course (the undergraduate or the graduate
version) may serve as the elective.

Smallest correct representation: `"op": "one_of"` for each of the four pairs
(each pair contributing at most one course toward the elective pool).
