"""Transcript PDF -> structured course rows, in one LLM call.

The whole document goes to the model at once. There is no chunking, no
per-section retry, and no verbatim cross-check of the model's output against
the source text: gemma4:12b follows the prompt below well enough to read a
full transcript, and the user reviews and edits every row in the UI before
anything is applied to a plan. A wrong row is a checkbox the user unticks,
not a corruption — so this optimizes for a clear prompt over a strict harness.

The model also decides pass vs fail. The grading rules are spelled out in the
prompt rather than reimplemented in Python.

PII: the PDF bytes and the extracted text stay in memory for the life of the
request. They are never written to disk and never logged.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

from pypdf import PdfReader

from . import llm


class TranscriptError(Exception):
    """The upload could not be read as a text-bearing PDF."""


def extract_pdf_text(data: bytes) -> str:
    """Whole-document text via pypdf.

    Raises TranscriptError when the file is not readable as a PDF or has no
    text layer (i.e. it is a scan and would need OCR).
    """
    try:
        reader = PdfReader(io.BytesIO(data))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as exc:
        raise TranscriptError(
            "could not read this file as a PDF — it may be corrupt or password-protected"
        ) from exc
    if not text.strip():
        raise TranscriptError(
            "no extractable text in this PDF — is it a scanned image? Only "
            "text-based transcripts (e.g. the MyUCSC PDF export) are supported."
        )
    return text


PROMPT_VERSION = "transcript-wholedoc-v1"
SYSTEM_PROMPT = """\
You read a university transcript and list every course the student enrolled in.

Respond with JSON only, in exactly this shape:
{"courses": [["CSE 30", "2021 Fall", "A", 7.0, true]]}

Each course is an ARRAY of exactly 5 values, always in this order:
[code, term, grade, earned, completed]

The transcript is organized into term sections under headings like
"2021 Fall Quarter". Under each heading is a table of course rows, each with a
subject code, a course number, a description, attempted units, earned units,
and a grade.

Emit one array for every course row in every term:
- code: subject and number exactly as printed, with one space between them.
  Examples: "CSE 30", "MATH 19A", "CSE 115B", "WRIT 2", "HIS 10A".
  Do not put the course description in this field.
- term: the term heading the row appears under, formatted "YYYY Season".
  Examples: "2021 Fall", "2022 Winter", "2023 Summer".
- grade: the grade exactly as printed. Use "" when no grade is printed.
- earned: the number in the earned-units column for that row, not attempted.
- completed: true if the student successfully completed the course, else false.

How to decide completed:
- Letter grades A+ through D- are completed.
- P (pass) and S (satisfactory) are completed.
- NP (no pass), F, U (unsatisfactory), W (withdrawn), I (incomplete),
  IP (in progress) and NR (no record) are NOT completed.
- A row with no grade printed is still in progress, so completed is false.
- Judge every row on its own grade. When a student took the same course twice,
  emit both rows, each with its own grade and its own completed value.

Never invent a course: emit only rows that literally appear in the document.
Ignore everything that is not a course row, including the student name and ID
header, "Test Credits" and transfer-credit totals, Term GPA / Term Totals /
Transfer Totals / Combined Totals lines, "Academic Standing" lines,
Degree/Program/Plan lines, column headers, and page headers and footers.
"""


@dataclass
class CourseRow:
    code: str  # normalized for catalog lookup: CSE30
    raw_code: str  # as the model read it: CSE 30
    term: str
    grade: str
    earned_units: float
    completed: bool


def normalize_code(code: str) -> str:
    return code.replace(" ", "").upper()


def _to_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def parse_transcript(text: str) -> list[CourseRow]:
    """One LLM call for the whole document.

    Raises OllamaUnavailable if the service drops mid-call, OllamaBadResponse
    if the reply is not usable JSON. Individual rows that come back malformed
    are skipped rather than failing the whole import — the user is reviewing
    the result anyway.
    """
    parsed = llm.chat_json(SYSTEM_PROMPT, text)
    if parsed is None:
        raise llm.OllamaBadResponse("the model did not return usable JSON")
    items = parsed.get("courses")
    if not isinstance(items, list):
        raise llm.OllamaBadResponse("the model's reply had no 'courses' list")

    rows: list[CourseRow] = []
    for item in items:
        # [code, term, grade, earned, completed]
        if not isinstance(item, list) or len(item) != 5:
            continue
        raw = str(item[0] or "").strip()
        code = normalize_code(raw)
        if not code:
            continue
        rows.append(
            CourseRow(
                code=code,
                raw_code=raw,
                term=str(item[1] or "").strip(),
                grade=str(item[2] or "").strip(),
                earned_units=_to_float(item[3]),
                completed=bool(item[4]),
            )
        )
    return rows
