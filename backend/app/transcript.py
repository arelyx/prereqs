"""Transcript-import pipeline: PDF bytes → plaintext → per-quarter chunks →
serial LLM extraction → validated course rows.

Privacy contract: the uploaded file and its text live only in request-local
memory — never written to disk, never logged, never echoed into error
messages. Chunking starts at the first quarter heading, so the identity
header (name, student ID) is not even sent to the (local) LLM. The API layer
buffers the multipart body itself precisely so Starlette's parser never
spools it to a temp file (see `api/transcript.py`).

Cost contract: PDF text extraction is pure-Python pypdf and therefore holds
the GIL of the whole worker, with superlinear cost in text volume. Every
extraction is bounded by pages, decompressed content-stream bytes, extracted
characters and wall-clock — and aborts mid-page, not after it.

Failure contract: the LLM is the only parser. If it is unreachable the
feature refuses (503 at the API layer); if it emits garbage after one retry
the request fails (502). There is no heuristic/regex fallback parsing —
half-right silent guesses are worse than a clean refusal.
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass

from pydantic import BaseModel, Field, ValidationError

from . import llm
from .config import settings

# --- PDF → text -------------------------------------------------------------


class TranscriptError(Exception):
    """User-correctable input problem (maps to 422)."""


# Deliberately a BaseException, not an Exception: it is raised from inside a
# pypdf visitor callback and has to unwind through pypdf's own broad
# per-operator `except Exception` handling without being swallowed. Never
# escapes this module — extract_pdf_text converts it to TranscriptError.
class _ExtractBudgetExceeded(BaseException):
    pass


# Same message for every budget breach: which limit tripped is a property of
# the uploaded file, and saying so would describe its contents.
TOO_COMPLEX = (
    "this PDF is too large or too complex to process — please upload the "
    "plain MyUCSC unofficial-transcript PDF export, not a scan, a merged "
    "packet, or a printed-to-PDF web page"
)


_OVER_ANY_CAP = 1 << 62


def _content_stream_bytes(page) -> int:
    """Decompressed content-stream size for one page, WITHOUT parsing its
    operators. `page.get_contents()` builds a ContentStream, which is exactly
    the expensive operator loop we are trying to bound, so go through the raw
    stream objects instead."""
    from pypdf.errors import LimitReachedError
    from pypdf.generic import ArrayObject

    try:
        raw = page.get("/Contents")
        if raw is None:
            return 0
        obj = raw.get_object()
        parts = list(obj) if isinstance(obj, ArrayObject) else [obj]
        total = 0
        for part in parts:
            total += len(part.get_object().get_data())
        return total
    except LimitReachedError:
        # pypdf refused to decompress past its own 75 MB ceiling: the stream is
        # bigger than anything we would accept, by a wide margin.
        return _OVER_ANY_CAP
    except Exception:
        # Never fail a legitimate PDF over an accounting quirk; the char cap
        # and the wall-clock deadline still bound the page.
        return 0


def extract_pdf_text(
    data: bytes,
    *,
    max_pages: int | None = None,
    max_chars: int | None = None,
    max_stream_bytes: int | None = None,
    time_budget: float | None = None,
) -> str:
    """Whole-document text via pypdf, under hard resource bounds.

    Raises TranscriptError when the file is not readable as a PDF, has no text
    layer (scanned image), or exceeds any extraction budget.

    Every budget is cumulative over the document and enforced *during*
    extraction, so no single page can run away: the operator budget is spent
    before each page is walked, and the character count and the clock are
    re-checked inside the text visitor, which aborts a page mid-flight.
    """
    import io

    from pypdf import PdfReader
    from pypdf.errors import LimitReachedError

    max_pages = settings.transcript_max_pages if max_pages is None else max_pages
    max_chars = settings.transcript_max_text_chars if max_chars is None else max_chars
    max_stream = (
        settings.transcript_max_stream_bytes if max_stream_bytes is None else max_stream_bytes
    )
    budget = settings.transcript_extract_seconds if time_budget is None else time_budget
    deadline = time.monotonic() + budget

    try:
        reader = PdfReader(io.BytesIO(data))
        page_count = len(reader.pages)
    except Exception as exc:
        raise TranscriptError("could not read this file as a PDF") from exc

    if page_count > max_pages:
        raise TranscriptError(
            f"this PDF has {page_count} pages; transcripts of up to {max_pages} "
            "pages are supported"
        )

    parts: list[str] = []
    used = 0
    stream_used = 0
    for page in reader.pages:
        if time.monotonic() > deadline:
            raise TranscriptError(TOO_COMPLEX)
        # Spend the operator budget BEFORE walking the page. Decompressing to
        # measure is C-speed zlib; walking the operators is the pure-Python
        # part whose cost we are actually bounding.
        stream_used += _content_stream_bytes(page)
        if stream_used > max_stream:
            raise TranscriptError(TOO_COMPLEX)

        remaining = max_chars - used
        seen = [0, 0]  # [chars this page, visitor calls]

        def visitor(text, cm, tm, font_dict, font_size, _seen=seen, _left=remaining):
            _seen[0] += len(text)
            _seen[1] += 1
            if _seen[0] > _left:
                raise _ExtractBudgetExceeded
            # time.monotonic() is cheap but this fires per text operator;
            # sampling keeps the check off the hot path.
            if _seen[1] % 512 == 0 and time.monotonic() > deadline:
                raise _ExtractBudgetExceeded

        try:
            page_text = page.extract_text(visitor_text=visitor) or ""
        except _ExtractBudgetExceeded:
            raise TranscriptError(TOO_COMPLEX) from None
        except LimitReachedError as exc:  # pypdf's own decompression ceiling
            raise TranscriptError(TOO_COMPLEX) from exc
        except Exception as exc:
            raise TranscriptError("could not read this file as a PDF") from exc

        used += len(page_text)
        if used > max_chars:
            raise TranscriptError(TOO_COMPLEX)
        parts.append(page_text)

    text = "\n".join(parts)
    if not text.strip():
        raise TranscriptError(
            "no extractable text in this PDF — is it a scanned image? "
            "Only text-based transcripts (e.g. the MyUCSC PDF export) are supported."
        )
    return text


# --- text → per-quarter chunks ----------------------------------------------

TERM_HEADING_RE = re.compile(
    r"^\s*((?:19|20)\d{2})\s+(Fall|Winter|Spring|Summer)\s+Quarter\s*$", re.MULTILINE
)
# Lines that end the course rows of the final section on a page.
CHUNK_TERMINATOR_RE = re.compile(
    r"^\s*(?:Undergraduate Career Totals|Graduate Career Totals|"
    r"Non-Course Milestones|End of\b)",
    re.MULTILINE,
)
MAX_CHUNKS = 60  # a real transcript has well under 60 quarters
MAX_CHUNK_CHARS = 6000  # keeps prompt + chunk safely inside num_ctx=4096


@dataclass
class TermChunk:
    term: str  # e.g. "2021 Fall"
    text: str


def split_terms(text: str) -> list[TermChunk]:
    """Split transcript text into per-quarter chunks. Everything before the
    first quarter heading (identity header, transfer-credit totals) is
    dropped — transfer totals carry no course rows and must not be parsed."""
    headings = list(TERM_HEADING_RE.finditer(text))
    chunks: list[TermChunk] = []
    for i, m in enumerate(headings):
        start = m.start()
        end = headings[i + 1].start() if i + 1 < len(headings) else len(text)
        body = text[start:end]
        term_end = CHUNK_TERMINATOR_RE.search(body)
        if term_end:
            body = body[: term_end.start()]
        chunks.append(TermChunk(term=f"{m.group(1)} {m.group(2)}", text=body.strip()))
    return chunks


# --- LLM extraction ----------------------------------------------------------

PROMPT_VERSION = "transcript-extract-v1"
SYSTEM_PROMPT = """\
You extract course rows from ONE quarter section of a university transcript.
Respond with JSON only, exactly this shape:
{"courses": [{"code": "CSE 30", "title": "Prog Abs Python", "attempted": 7.0, "earned": 7.0, "grade": "A"}]}

Rules:
- A course row starts with a course code: 1-4 UPPERCASE letters, a space, then a
  number optionally followed by letters (examples: "CSE 30", "MATH 19A", "CSE 115B",
  "WRIT 2", "HIS 10A"). Copy the code exactly as printed.
- Copy attempted units, earned units, and the grade exactly from that row.
  Grades may be letter grades (A+ through F), P, NP, S, U, W, or I.
- If a row has no grade printed (course still in progress), use "" for grade.
- Do NOT invent or infer courses. Ignore GPA lines, Term Totals, Transfer Totals,
  Combined totals, Academic Standing lines, Program/Plan lines, honors lines,
  and any non-course text.
- If the section contains no course rows, return {"courses": []}.
"""

# Leading course-code pattern. The model sometimes glues the title onto the
# code ("CRWN 1 ALE:Emerging Tech", seen live with qwen3:4b) — we trim to the
# leading code and still require it to appear verbatim in the section text.
CODE_EXTRACT_RE = re.compile(r"^([A-Z]{1,4}\s?\d+[A-Z]{0,2})(?=$|[\s:])")

# Grades that mean the course was NOT completed even if listed:
# NP (no pass), F, U (unsatisfactory), W (withdrawn), I (incomplete),
# IP (in progress), NR (no record).
NON_PASSING_GRADES = {"NP", "F", "U", "W", "I", "IP", "NR"}

# Every token we accept as a grade. In-progress rows have no grade printed,
# and the model then tends to copy the points column ("0.000", seen live)
# into the grade field — anything not matching this is treated as no-grade.
GRADE_RE = re.compile(r"^(?:[A-D][+-]?|F|P|NP|S|U|W|I|IP|NR)$")


def sanitize_grade(grade: str) -> str:
    g = (grade or "").strip().upper()
    return g if GRADE_RE.match(g) else ""


class ExtractedCourse(BaseModel):
    # Generous cap: the model sometimes glues the row title onto the code;
    # _validate_chunk trims to the leading code pattern.
    code: str = Field(min_length=2, max_length=64)
    title: str = ""
    attempted: float | None = None
    earned: float | None = None
    grade: str = Field(default="", max_length=16)


class ChunkResult(BaseModel):
    courses: list[ExtractedCourse] = Field(max_length=30)


@dataclass
class CourseRow:
    code: str  # normalized: CSE30
    raw_code: str  # as printed: CSE 30
    title: str
    term: str
    grade: str
    earned_units: float
    completed: bool


def normalize_code(code: str) -> str:
    return code.replace(" ", "").upper()


def is_completed(grade: str, earned: float | None) -> bool:
    g = (grade or "").strip().upper()
    if not g:  # no grade printed: in progress, not completed
        return False
    if g in NON_PASSING_GRADES:
        return False
    return (earned or 0.0) > 0.0


def _validate_chunk(parsed: dict | None, chunk: TermChunk) -> list[CourseRow] | None:
    """Schema-validate one LLM response and cross-check every row against the
    chunk text (anti-fabrication). Returns None when the response is unusable
    (caller retries once)."""
    if parsed is None:
        return None
    try:
        result = ChunkResult.model_validate(parsed)
    except ValidationError:
        return None
    haystack = normalize_code(chunk.text)  # spaces stripped, uppercased
    rows: list[CourseRow] = []
    for c in result.courses:
        m = CODE_EXTRACT_RE.match(c.code.strip())
        if not m:
            return None  # structurally wrong codes = garbage response
        raw = m.group(1)
        if normalize_code(raw) not in haystack:
            return None  # fabricated row not present in the source text
        grade = sanitize_grade(c.grade)
        rows.append(
            CourseRow(
                code=normalize_code(raw),
                raw_code=raw,
                title=(c.title or "").strip(),
                term=chunk.term,
                grade=grade,
                earned_units=c.earned or 0.0,
                completed=is_completed(grade, c.earned),
            )
        )
    return rows


def parse_chunk(chunk: TermChunk) -> list[CourseRow]:
    """One serial LLM call (plus at most ONE retry) for one quarter section.

    Raises llm.OllamaUnavailable if the service is down and
    llm.OllamaBadResponse if it still returns garbage after the retry.
    """
    text = chunk.text[:MAX_CHUNK_CHARS]
    for seed in (42, 43):
        parsed = llm.chat_json(SYSTEM_PROMPT, text, seed=seed)
        rows = _validate_chunk(parsed, chunk)
        if rows is not None:
            return rows
    raise llm.OllamaBadResponse(
        f"LLM returned unusable output for section '{chunk.term}' after one retry"
    )
