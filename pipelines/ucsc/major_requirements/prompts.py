"""Heading-classification prompt for the major-requirements pipeline.

Most rule headings are classified deterministically (structure.HEADING_PATTERNS
— the SmartCatalog vocabulary is semi-controlled). The small LLM is only the
fallback for headings the patterns don't match, with a deliberately tiny task:
choose an operator and a count. Its output is validated hard: op must be in
the enum, and a claimed count must literally appear (as digit or number-word)
in the heading/prose, else the rule is quarantined for human review.
"""

from __future__ import annotations

PROMPT_VERSION = "rule_op_v1"

SYSTEM_PROMPT = """You classify a university degree-requirement rule. You get the rule's HEADING, optional PROSE, and how many courses/branches its table has. Answer ONLY a JSON object:
{"op": "<one of: all_of | one_of | n_of | options | category_count | unknown>", "n": <integer or null>}

Meanings:
- all_of: every listed course is required. ("All of the following", "Take the following courses")
- one_of: exactly one of the listed courses. ("One of the following courses")
- n_of: N of the listed courses. n = N. ("Plus five economics electives:" -> n_of, 5; "Students should complete at least six of the following" -> n_of, 6)
- options: the table is split into alternative course sequences (branches>0); complete one whole branch.
- category_count: no course list; N courses from a described category. ("Plus two upper-division computer science courses" -> category_count, 2)
- unknown: cannot tell.

Rules:
- If branches > 0, the op is options unless the heading clearly says otherwise.
- "both" means 2. "either" with two listed courses means one_of.
- n MUST be a number that is actually stated in the heading or prose (as a word or digit). If no count is stated: for a single listed course use all_of; otherwise choose the best op with n=null.
- Answer JSON only.

Examples:
HEADING: "Plus five economics electives:" COURSES: 24 BRANCHES: 0
{"op": "n_of", "n": 5}
HEADING: "Concentration Requirements" PROSE: "Students complete four courses from the list below." COURSES: 12 BRANCHES: 0
{"op": "n_of", "n": 4}
HEADING: "Plus one of the following options" COURSES: 0 BRANCHES: 3
{"op": "options", "n": null}
HEADING: "Mathematics Placement" PROSE: "Complete one of the following:" COURSES: 3 BRANCHES: 0
{"op": "one_of", "n": null}
HEADING: "Plus two additional upper-division courses in the major" COURSES: 0 BRANCHES: 0
{"op": "category_count", "n": 2}
HEADING: "Recommended Preparation" COURSES: 2 BRANCHES: 0
{"op": "unknown", "n": null}"""


def user_message(heading: str, prose: list[str], n_courses: int, n_branches: int) -> str:
    parts = [f'HEADING: "{heading}"']
    if prose:
        parts.append(f'PROSE: "{" ".join(prose)[:600]}"')
    parts.append(f"COURSES: {n_courses} BRANCHES: {n_branches}")
    return " ".join(parts)
