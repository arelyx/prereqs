"""Prereq-structuring prompt for qwen3:4b, versioned.

This is the POC's battle-tested prompt (prereqs-archive yoink/ollama_core.py),
tuned against a Gemini Flash baseline over the full catalog. Snapshots record
PROMPT_VERSION so structured data is traceable to the exact prompt text.

Design notes (why the prompt is shaped this way, learned the hard way):
- The single dominant failure mode of small models here is treating "and" as a
  joiner; the prompt hammers the and-separates / or-joins rule with 15 few-shot
  examples covering every observed pattern class in the catalog research doc.
- Output is a bare {"groups": [[..]]} object; anything else (typed coreq
  fields etc.) measurably degrades accuracy at 4B scale. Richer semantics are
  handled deterministically outside the model.
- Rule 11 ("verbatim only") licenses the deterministic hallucination guard:
  any emitted code not present in the source text is dropped by clean_groups.
"""

from __future__ import annotations

import re

from common import codes

PROMPT_VERSION = "prereq_v1"

SYSTEM_PROMPT = """You extract course prerequisites from a single university course's requirement text and express them as boolean groups.

OUTPUT: return ONLY a JSON object of the form {"groups": [[...], [...]]} and nothing else.
- Each inner array is an OR group: any ONE of its course IDs satisfies that group.
- Separate arrays are ANDed together: every array must be satisfied.
- If there are no course prerequisites, return {"groups": []}.

THE SINGLE MOST IMPORTANT RULE: the word "and" is a SEPARATOR. Every time you see
"and" (or a semicolon ";") between two courses, they go in DIFFERENT arrays.
The word "or" is a JOINER: courses joined by "or" go in the SAME array. Do not
confuse these. When two courses look related (e.g. a course and its lab like
CSE 15 and CSE 15L), "and" STILL means separate arrays.

RULES (apply mechanically, scanning left to right):
1. "and" and ";" SEPARATE -> start a NEW array.
     "A and B"      -> [["A"], ["B"]]
     "A and B and C"-> [["A"], ["B"], ["C"]]
2. "or" JOINS -> stay in the SAME array. Commas between or-joined items don't matter.
     "A or B"          -> [["A", "B"]]
     "A, or B, or C"   -> [["A", "B", "C"]]
     "A , B , or C"    -> [["A", "B", "C"]]   (comma list ending in "or" = all OR)
3. Mixed: split on every "and"/";", keep "or"-runs together.
     "A or B ; and C or D"     -> [["A", "B"], ["C", "D"]]
     "A and B or C"            -> [["A"], ["B", "C"]]
     "A , B , and C"           -> [["A"], ["B"], ["C"]]   (comma list ending in "and" = all AND, each its own array)
     A course and its lab ("X and XL") are ALWAYS separate arrays: "CSE 15 and CSE 15L" -> [["CSE15"], ["CSE15L"]].
4. A run of alternatives separated only by ";" that each begin with "or" (i.e. "; or")
   is still ONE big OR group:  "A or B ; or C ; or D" -> [["A", "B", "C", "D"]].
5. Normalize course codes: UPPER-CASE the letters and remove the internal space. "CSE 12" -> "CSE12", "Math 117" -> "MATH117", "Ling 50" -> "LING50".
6. A course ID is LETTERS followed by DIGITS with an optional trailing letter (e.g. CSE12, MATH19B, STAT131A). Only emit tokens that look like course IDs.
7. Concurrent enrollment:
   - If a coreq appears INSIDE the "Prerequisite(s): ..." clause (e.g. "; previous or concurrent enrollment in CSE 100L is required"), INCLUDE that course as its own AND-group.
   - If a SEPARATE sentence says "Concurrent enrollment in X is required." (after the prerequisite list), do NOT include X.
8. When a course is followed by "or equivalent", "or consent of instructor", or "or instructor consent", KEEP the course and just drop the "equivalent"/"consent" phrase. "CSE 201 or equivalent or consent" -> [["CSE201"]].
9. EXCLUDE anything that is not a course ID: "permission of instructor", writing requirements, class/junior/senior/graduate standing, GPA, placement/MPE exam scores, standalone "equivalent", "Test Out", major/enrollment restrictions.
10. EXCLUDE courses that are only "recommended" or given as an example ("e.g.") -- those are not required.
11. Only include course IDs that appear verbatim in the text. Never invent or infer prerequisites.
12. Ignore antirequisites and "cannot receive credit" statements -- they are not prerequisites.

Examples:
Text: "Requirements Prerequisite(s): CSE 12 and CSE 101 ."
Output: {"groups": [["CSE12"], ["CSE101"]]}

Text: "Requirements Prerequisite(s): CSE 5J , or CSE 20 , or CSE 30 , or BME 160 , or equivalent."
Output: {"groups": [["CSE5J", "CSE20", "CSE30", "BME160"]]}

Text: "Requirements Prerequisite(s): satisfaction of the Entry Level Writing requirements and CSE 101 and CSE 130 ."
Output: {"groups": [["CSE101"], ["CSE130"]]}

Text: "Requirements Enrollment is restricted to graduate students or previous enrollment in CHEM 151A , CHEM 151L , and CHEM 146B ."
Output: {"groups": [["CHEM151A"], ["CHEM151L"], ["CHEM146B"]]}

Text: "Requirements Prerequisite(s): MATH 3 or MATH 11A ; or AM 3 or AM 6 ; or AM 11B or ECON 11A; or score on math placement exam of 300 or higher."
Output: {"groups": [["MATH3", "MATH11A", "AM3", "AM6", "AM11B", "ECON11A"]]}

Text: "Requirements Prerequisite(s): CSE 150 . Concurrent enrollment in CSE 151L is required."
Output: {"groups": [["CSE150"]]}

Text: "Requirements Prerequisite(s): CSE 101 and MATH 21 or AM 10 ."
Output: {"groups": [["CSE101"], ["MATH21", "AM10"]]}

Text: "Requirements Prerequisite(s): CSE 12 or BME 160 ; CSE 13E or ECE 13 or CSE 13S ; and CSE 16 ; and CSE 30 ; and MATH 11B or MATH 19B or MATH 20B or AM 11B or ECON 11B."
Output: {"groups": [["CSE12", "BME160"], ["CSE13E", "ECE13", "CSE13S"], ["CSE16"], ["CSE30"], ["MATH11B", "MATH19B", "MATH20B", "AM11B", "ECON11B"]]}

Text: "Requirements Prerequisite(s): CSE 16 and CSE 12 ; and CSE 30 , or CSE 15 and CSE 15L."
Output: {"groups": [["CSE16"], ["CSE12"], ["CSE30", "CSE15"], ["CSE15L"]]}

Text: "Requirements Prerequisite(s): CSE 12 ; previous or concurrent enrollment in CSE 100L is required."
Output: {"groups": [["CSE12"], ["CSE100L"]]}

Text: "Requirements Prerequisite(s): previous or concurrent enrollment in ENVS 100 and ENVS 100L , or by permission of instructor."
Output: {"groups": [["ENVS100"], ["ENVS100L"]]}

Text: "Requirements Prerequisite(s): CSE 201 or equivalent or consent of instructor. Enrollment is restricted to graduate students."
Output: {"groups": [["CSE201"]]}

Text: "Requirements Prerequisite(s): CHIN 2 , placement by assessment, or instructor permission."
Output: {"groups": [["CHIN2"]]}

Text: "Requirements Prerequisite(s): Math 117."
Output: {"groups": [["MATH117"]]}

Text: "Requirements Prerequisite(s): CSE 12 ; and CSE 13E, or CSE 13S , or ECE 13 , or CSE 15 and CSE 15L. CSE 16 recommended."
Output: {"groups": [["CSE12"], ["CSE13E", "CSE13S", "ECE13", "CSE15"], ["CSE15L"]]}

Text: "Requirements Antirequisite: Students cannot enroll after receiving a C or better in CSE 30."
Output: {"groups": []}"""

PREREQ_WORD = re.compile(r"prerequisite", re.IGNORECASE)

# A standalone "Concurrent enrollment in X is required." sentence is a
# scheduling note, not a prerequisite (the inline "previous or concurrent
# enrollment in X" form IS one). Stripping the standalone form before the
# model sees it is far more reliable than asking a 4B model to distinguish.
_STANDALONE_COREQ_RE = re.compile(
    r"concurrent enrollment in [^.;]*?(?:is |are )?required[.]?",
    re.IGNORECASE,
)


def needs_llm(raw_requirements: str | None) -> bool:
    """Only text referencing a course code (or the word 'prerequisite') can
    encode a prereq; everything else maps to [] with no LLM call."""
    if not raw_requirements or not raw_requirements.strip():
        return False
    return bool(codes.CODE_IN_TEXT_RE.search(raw_requirements)) or bool(
        PREREQ_WORD.search(raw_requirements)
    )


def preprocess(raw_requirements: str) -> str:
    """Drop standalone concurrent-enrollment sentences (keep inline coreqs)."""
    def _strip(m: re.Match) -> str:
        preceding = raw_requirements[max(0, m.start() - 12): m.start()].lower()
        if preceding.endswith("previous or ") or preceding.endswith("or "):
            return m.group(0)  # inline coreq form -> keep
        return ""

    return _STANDALONE_COREQ_RE.sub(_strip, raw_requirements).strip()


def user_message(raw_requirements: str) -> str:
    return f'Text: "{raw_requirements.strip()}"\nOutput:'


def clean_groups(parsed: dict | None, raw_requirements: str) -> list[list[str]]:
    """Validate model output into prereq groups.

    Deterministic hallucination guard: every emitted code must appear verbatim
    (case/space-insensitively) in the source text, per prompt rule 11.
    """
    if not isinstance(parsed, dict) or not isinstance(parsed.get("groups"), list):
        return []
    allowed = codes.extract_codes(raw_requirements)
    cleaned: list[list[str]] = []
    for group in parsed["groups"]:
        if not isinstance(group, list):
            continue
        norm: list[str] = []
        for item in group:
            cid = codes.normalize(str(item))
            if cid and cid not in norm and codes.is_course_id(cid) and cid in allowed:
                norm.append(cid)
        if norm:
            cleaned.append(norm)
    return cleaned
