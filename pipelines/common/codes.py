"""Course-code normalization helpers.

UC-style codes: 2-5 letter subject + 1-3 digit number + optional trailing
letter(s) (CSE 12, MATH 19B, STAT 131A, CSE 115A). Canonical internal form is
UPPERCASE with no internal space: "CSE12", "MATH19B".
"""

from __future__ import annotations

import re

COURSE_ID_RE = re.compile(r"^[A-Z]{2,5}[0-9]{1,3}[A-Z]{0,2}$")
CODE_IN_TEXT_RE = re.compile(r"[A-Za-z]{2,5}\s?[0-9]{1,3}[A-Z]{0,2}\b")


def normalize(code: str) -> str:
    """'Cse 12' / 'CSE 12' -> 'CSE12'."""
    return code.replace(" ", "").upper().strip()


def is_course_id(token: str) -> bool:
    return bool(COURSE_ID_RE.match(token))


def extract_codes(text: str) -> set[str]:
    """All normalized course-code tokens appearing in `text`.

    Case-insensitive so title-case catalog references ('Math 117') are found.
    Used as the verbatim-presence guard against LLM-hallucinated codes.
    """
    return {normalize(m.group(0)) for m in CODE_IN_TEXT_RE.finditer(text or "")}


def display(code: str) -> str:
    """'CSE12' -> 'CSE 12' (for UI display)."""
    m = re.match(r"^([A-Z]+)([0-9].*)$", code)
    return f"{m.group(1)} {m.group(2)}" if m else code
