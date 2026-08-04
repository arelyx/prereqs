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
extraction is bounded by pages, decompressed operator-stream bytes, form
XObject traversals, extracted characters and wall-clock — and aborts
mid-page, not after it. "Operator stream" means every stream pypdf actually
walks, page contents and `Do`-invoked forms alike; bounding only the former
left the whole bomb class reachable through one extra level of indirection.

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

# One clock check per this many operators / text runs. time.monotonic() is
# cheap, but these callbacks fire on every operator in the document.
_CLOCK_SAMPLE = 512


def _decoded_len(obj) -> int:
    """Decompressed size of one stream object, WITHOUT parsing its operators.
    Decompression is C-speed zlib and pypdf caches the result, so measuring
    costs nothing that the walk was not about to spend anyway."""
    from pypdf.errors import LimitReachedError

    try:
        return len(obj.get_object().get_data())
    except LimitReachedError:
        # pypdf refused to decompress past its own 75 MB ceiling: the stream is
        # bigger than anything we would accept, by a wide margin.
        return _OVER_ANY_CAP
    except Exception:
        # Never fail a legitimate PDF over an accounting quirk; the char cap
        # and the wall-clock deadline still bound the walk.
        return 0


def _content_stream_bytes(page) -> int:
    """Decompressed content-stream size for one page. `page.get_contents()`
    builds a ContentStream, which is exactly the expensive operator loop we
    are trying to bound, so go through the raw stream objects instead.

    Covers ONLY the page's own /Contents. Form XObjects reached by `Do` are
    charged separately, as pypdf walks into them (see `_Budget.enter_form`)."""
    from pypdf.generic import ArrayObject

    try:
        raw = page.get("/Contents")
        if raw is None:
            return 0
        obj = raw.get_object()
        parts = list(obj) if isinstance(obj, ArrayObject) else [obj]
        return sum(_decoded_len(part) for part in parts)
    except Exception:
        return 0


class _Budget:
    """Whole-document extraction budget, spent as pypdf walks.

    Charges every stream that is actually *walked*, not every stream that
    exists: a form invoked by four `Do`s is walked four times and costs four
    times as much, so it is charged four times.
    """

    def __init__(
        self, *, deadline: float, max_stream: int, max_traversals: int, max_depth: int
    ) -> None:
        self.deadline = deadline
        self.max_stream = max_stream
        self.max_traversals = max_traversals
        self.max_depth = max_depth
        self.stream_used = 0
        self.traversals = 0
        self.depth = 0
        self.ops = 0

    def spend_stream(self, nbytes: int) -> None:
        self.stream_used += nbytes
        if self.stream_used > self.max_stream:
            raise _ExtractBudgetExceeded

    def check_clock(self) -> None:
        if time.monotonic() > self.deadline:
            raise _ExtractBudgetExceeded

    def tick_operator(self) -> None:
        """Called before every operator pypdf executes, page or form. This is
        the only deadline check that fires inside an operator stream producing
        no text — which is exactly what a bomb's stream produces."""
        self.ops += 1
        if self.ops % _CLOCK_SAMPLE == 0:
            self.check_clock()

    def enter_form(self, nbytes: int) -> None:
        self.traversals += 1
        if self.traversals > self.max_traversals:
            raise _ExtractBudgetExceeded
        self.depth += 1
        if self.depth > self.max_depth:
            raise _ExtractBudgetExceeded
        self.check_clock()
        self.spend_stream(nbytes)

    def leave_form(self) -> None:
        self.depth -= 1


def _bind_form_accounting(page, budget: _Budget) -> None:
    """Route every form-XObject traversal through the budget.

    pypdf recurses into a form via `self.extract_xform_text` from inside its
    operator loop, once per `Do` — and it discards the form's id from its
    cyclic-reference guard in a `finally`, so N `Do`s at one form walk it N
    times. None of that traffic passes through `page["/Contents"]`, so the
    stream budget used to measure a small fraction of the work actually done:
    measured pre-fix, a 3.4 KB upload holding a 1 MB form walked 0.65 s per
    `Do`, linearly and without limit (Do x16 = 9.65 s), while the page-level
    accounting saw 20 bytes.

    Shadowing the bound method on the page instance covers nested forms too:
    pypdf's recursion keeps calling it on the same page object.
    """
    original = getattr(page, "extract_xform_text", None)
    if original is None:  # pragma: no cover - pinned by test_form_traversals_are_charged
        # A pypdf release renamed the recursion entry point. Degrade to
        # clock-only bounding rather than 500ing every upload; the test named
        # above fails loudly so this is never the silent state for long.
        return

    def accounted(xform, *args, **kwargs):
        budget.enter_form(_decoded_len(xform))
        try:
            return original(xform, *args, **kwargs)
        finally:
            budget.leave_form()

    page.extract_xform_text = accounted


def extract_pdf_text(
    data: bytes,
    *,
    max_pages: int | None = None,
    max_chars: int | None = None,
    max_stream_bytes: int | None = None,
    time_budget: float | None = None,
    max_xobject_traversals: int | None = None,
    max_xobject_depth: int | None = None,
) -> str:
    """Whole-document text via pypdf, under hard resource bounds.

    Raises TranscriptError when the file is not readable as a PDF, has no text
    layer (scanned image), or exceeds any extraction budget.

    Every budget is cumulative over the document and enforced *during*
    extraction, so neither a page nor a form XObject can run away: stream
    bytes are spent before each page and before each `Do` traversal is walked,
    the traversal count and nesting depth are capped, and the clock is
    re-checked per operator — not only per text run, since a bomb's operators
    emit no text — aborting the walk mid-page and mid-form.
    """
    import io

    from pypdf import PdfReader
    from pypdf.errors import LimitReachedError

    max_pages = settings.transcript_max_pages if max_pages is None else max_pages
    max_chars = settings.transcript_max_text_chars if max_chars is None else max_chars
    max_stream = (
        settings.transcript_max_stream_bytes if max_stream_bytes is None else max_stream_bytes
    )
    seconds = settings.transcript_extract_seconds if time_budget is None else time_budget
    max_traversals = (
        settings.transcript_max_xobject_traversals
        if max_xobject_traversals is None
        else max_xobject_traversals
    )
    max_depth = (
        settings.transcript_max_xobject_depth
        if max_xobject_depth is None
        else max_xobject_depth
    )
    budget = _Budget(
        deadline=time.monotonic() + seconds,
        max_stream=max_stream,
        max_traversals=max_traversals,
        max_depth=max_depth,
    )

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
    for page in reader.pages:
        try:
            budget.check_clock()
            # Spend the stream budget BEFORE walking the page. Decompressing to
            # measure is C-speed zlib; walking the operators is the pure-Python
            # part whose cost we are actually bounding.
            budget.spend_stream(_content_stream_bytes(page))
        except _ExtractBudgetExceeded:
            raise TranscriptError(TOO_COMPLEX) from None

        remaining = max_chars - used
        seen = [0]  # chars this page

        def visitor(text, cm, tm, font_dict, font_size, _seen=seen, _left=remaining):
            _seen[0] += len(text)
            if _seen[0] > _left:
                raise _ExtractBudgetExceeded

        def op_visitor(operator, operands, cm, tm, _b=budget):
            _b.tick_operator()

        _bind_form_accounting(page, budget)
        try:
            page_text = (
                page.extract_text(visitor_text=visitor, visitor_operand_before=op_visitor)
                or ""
            )
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
