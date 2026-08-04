"""Transcript-import endpoints.

PUBLIC (anonymous users are first-class): upload an unofficial-transcript
PDF, get back a best-guess completed-courses list for the review UI. The
file is processed entirely in memory — never persisted, never logged.

Error taxonomy:
- 503  LLM (local Ollama) unreachable or model missing — feature refused.
- 502  LLM answered but produced unusable output after one retry.
- 422  input problem: unreadable PDF, no text layer, no quarter sections.
- 415  not a PDF.  413  over the size cap.  504  time budget exceeded.
- 429  too many parses already in flight.
"""

from __future__ import annotations

import threading
import time

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select

from .. import llm, transcript
from ..config import settings
from ..db import get_session_factory
from ..models import Course, University

router = APIRouter(tags=["transcript"])

# Parses serialize on the LLM lock anyway, so an unbounded queue buys nothing:
# every waiter occupies a threadpool thread (starving the sync endpoints that
# share it) and burns its own wall-clock budget waiting. Cap the in-flight set
# and shed load honestly instead.
_PARSE_SLOTS = threading.BoundedSemaphore(settings.transcript_max_concurrent)


@router.get("/transcript/status")
def transcript_status() -> dict:
    """Cheap availability probe the frontend calls before showing the feature."""
    available, detail = llm.check_available()
    return {
        "available": available,
        "model": settings.transcript_llm_model if available else None,
        "detail": detail,
    }


@router.post("/u/{university_id}/transcript/parse")
def parse_transcript(
    university_id: str,
    file: UploadFile = File(...),
    session_factory=Depends(get_session_factory),
) -> dict:
    # Short-lived sessions only. A parse blocks on the LLM for tens of seconds
    # (budget: minutes); holding a pooled connection across that pins it "idle
    # in transaction" and starves every other endpoint — measured as
    # QueuePool-timeout 500s on unrelated reads while parses were running.
    with session_factory() as db:
        if db.get(University, university_id) is None:
            raise HTTPException(404, "unknown university")

    # Refuse up front when the LLM is missing — there is no fallback parser.
    available, detail = llm.check_available()
    if not available:
        raise HTTPException(
            503,
            f"transcript import is unavailable: {detail}. "
            "This feature needs the local LLM service and is disabled without it.",
        )

    if (file.content_type or "") not in ("application/pdf", "application/x-pdf") and not (
        file.filename or ""
    ).lower().endswith(".pdf"):
        raise HTTPException(415, "only PDF transcripts are supported")
    data = file.file.read(settings.transcript_max_bytes + 1)
    if len(data) > settings.transcript_max_bytes:
        raise HTTPException(
            413, f"file too large (max {settings.transcript_max_bytes // (1024 * 1024)} MB)"
        )
    if not data.startswith(b"%PDF-"):
        raise HTTPException(415, "only PDF transcripts are supported")

    try:
        text = transcript.extract_pdf_text(data)
    except transcript.TranscriptError as exc:
        raise HTTPException(422, str(exc)) from exc

    chunks = transcript.split_terms(text)
    if not chunks:
        raise HTTPException(
            422,
            "no quarter sections found — this doesn't look like a UCSC "
            "unofficial transcript",
        )
    warnings: list[str] = []
    if len(chunks) > transcript.MAX_CHUNKS:
        warnings.append(
            f"transcript has {len(chunks)} quarter sections; only the first "
            f"{transcript.MAX_CHUNKS} were processed"
        )
        chunks = chunks[: transcript.MAX_CHUNKS]

    if not _PARSE_SLOTS.acquire(blocking=False):
        raise HTTPException(
            429,
            "too many transcript imports are being processed right now — "
            "please try again in a minute",
            headers={"Retry-After": "60"},
        )
    # One serial LLM call per quarter (repo invariant: never concurrent),
    # under an overall wall-clock budget.
    deadline = time.monotonic() + settings.transcript_budget_seconds
    rows: list[transcript.CourseRow] = []
    try:
        for chunk in chunks:
            if time.monotonic() > deadline:
                raise HTTPException(
                    504, "transcript parsing exceeded the time budget — try again later"
                )
            try:
                rows.extend(transcript.parse_chunk(chunk))
            except llm.OllamaUnavailable as exc:
                raise HTTPException(
                    503,
                    "the local LLM service became unavailable while parsing the "
                    "transcript — nothing was saved, try again later",
                ) from exc
            except llm.OllamaBadResponse as exc:
                # Section name only — never transcript text.
                raise HTTPException(502, str(exc)) from exc
    finally:
        _PARSE_SLOTS.release()

    # Cross-check against the catalog: only recognized codes are actionable.
    codes = {r.code for r in rows}
    with session_factory() as db:
        # Plain values, not ORM instances: the session closes here and
        # detached instances must not be attribute-accessed afterwards.
        catalog = dict(
            db.execute(
                select(Course.code, Course.title).where(
                    Course.university_id == university_id, Course.code.in_(codes)
                )
            ).all()
        )
    matched = [
        {
            "code": r.code,
            "title": catalog[r.code],
            "term": r.term,
            "grade": r.grade,
            "earned_units": r.earned_units,
            "completed": r.completed,
        }
        for r in rows
        if r.code in catalog
    ]
    unmatched = sorted({r.raw_code for r in rows if r.code not in catalog})
    return {"matched": matched, "unmatched": unmatched, "warnings": warnings}
