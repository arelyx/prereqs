"""Transcript-import endpoints.

PUBLIC (anonymous users are first-class): upload an unofficial-transcript
PDF, get back a best-guess completed-courses list for the review UI. The
file is processed entirely in memory — never persisted, never logged.

"In memory" is enforced, not assumed: the multipart body is buffered through
this module's own parser instead of FastAPI's `UploadFile = File(...)`,
because Starlette's default parser spools any upload over 1 MB to a temp file
*before* the endpoint runs. See `_InMemoryMultiPartParser`.

Error taxonomy:
- 503  LLM (local Ollama) unreachable or model missing — feature refused.
- 502  LLM answered but produced unusable output.
- 422  input problem: unreadable PDF, no text layer, or no courses found.
- 415  not a PDF.  413  over the size cap.  404  unknown university.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from starlette.concurrency import run_in_threadpool
from starlette.datastructures import UploadFile
from starlette.formparsers import MultiPartException, MultiPartParser

from .. import llm, transcript
from ..config import settings
from ..db import get_session_factory
from ..models import Course, University

router = APIRouter(tags=["transcript"])

# Room for the multipart boundary and part headers on top of the file bytes.
# The frontend sends exactly one field, so this is deliberately generous.
_MULTIPART_OVERHEAD = 64 * 1024


class _UploadTooLarge(MultiPartException):
    """Raised from inside the body stream. A MultiPartException subclass on
    purpose: Starlette's parser catches that, closes its file handles, and
    re-raises — so aborting mid-upload leaks nothing."""


class _InMemoryMultiPartParser(MultiPartParser):
    """Parser that cannot spill the upload to disk.

    Starlette buffers each file part in a `SpooledTemporaryFile` that rolls
    over to /tmp above `spool_max_size` (default 1 MB) — below this feature's
    size cap, so a real transcript could reach the filesystem before any of
    our code ran, contradicting the privacy claim the UI makes to the user.

    Raising the threshold past the hard byte cap makes rollover unreachable:
    `_read_upload` aborts the request stream above the cap, so no part can
    ever grow big enough to spool.
    """

    spool_max_size = settings.transcript_max_bytes + _MULTIPART_OVERHEAD + 1


def _too_large() -> HTTPException:
    return HTTPException(
        413, f"file too large (max {settings.transcript_max_bytes // (1024 * 1024)} MB)"
    )


async def _read_upload(request: Request) -> tuple[str, str, bytes]:
    """Buffer the `file` part of a multipart body in memory, refusing anything
    over the byte cap as it arrives. Returns (filename, content_type, bytes)."""
    if not request.headers.get("content-type", "").startswith("multipart/form-data"):
        raise HTTPException(422, "expected a multipart/form-data upload with a 'file' field")

    limit = settings.transcript_max_bytes + _MULTIPART_OVERHEAD

    async def capped_stream():
        total = 0
        async for chunk in request.stream():
            total += len(chunk)
            if total > limit:
                # Stop reading now: no point receiving megabytes we will refuse.
                raise _UploadTooLarge("upload exceeds the size cap")
            yield chunk

    parser = _InMemoryMultiPartParser(
        request.headers,
        capped_stream(),
        max_files=1,
        max_fields=4,
        max_part_size=limit,
    )
    try:
        form = await parser.parse()
    except _UploadTooLarge as exc:
        raise _too_large() from exc
    except MultiPartException as exc:
        # Never echo the body: the message is about the envelope only.
        raise HTTPException(422, "could not read the uploaded form data") from exc

    upload = form.get("file")
    if not isinstance(upload, UploadFile):
        raise HTTPException(422, "expected a multipart/form-data upload with a 'file' field")
    try:
        data = await upload.read()
        return (upload.filename or ""), (upload.content_type or ""), bytes(data)
    finally:
        await upload.close()


@router.get("/transcript/status")
def transcript_status() -> dict:
    """Cheap availability probe the frontend calls before showing the feature."""
    available, detail = llm.check_available()
    return {
        "available": available,
        "model": settings.transcript_llm_model if available else None,
        "detail": detail,
    }


@router.post(
    "/u/{university_id}/transcript/parse",
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "required": ["file"],
                        "properties": {"file": {"type": "string", "format": "binary"}},
                    }
                }
            },
        }
    },
)
async def parse_transcript(
    university_id: str,
    request: Request,
    session_factory=Depends(get_session_factory),
) -> dict:
    filename, content_type, data = await _read_upload(request)

    if content_type not in ("application/pdf", "application/x-pdf") and not (
        filename.lower().endswith(".pdf")
    ):
        raise HTTPException(415, "only PDF transcripts are supported")
    if len(data) > settings.transcript_max_bytes:
        raise _too_large()
    if not data.startswith(b"%PDF-"):
        raise HTTPException(415, "only PDF transcripts are supported")

    # Extraction is CPU-bound and the LLM call is long, so both run off the
    # event loop. The LLM lock inside llm.chat_json keeps calls serial.
    return await run_in_threadpool(_parse_pdf, university_id, data, session_factory)


def _parse_pdf(university_id: str, data: bytes, session_factory) -> dict:
    """The expensive half of a parse. Runs in the threadpool."""
    # Short-lived sessions only. A parse blocks on the LLM for tens of seconds;
    # holding a pooled connection across that pins it "idle in transaction" and
    # starves every other endpoint.
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

    try:
        text = transcript.extract_pdf_text(data)
    except transcript.TranscriptError as exc:
        raise HTTPException(422, str(exc)) from exc

    try:
        rows = transcript.parse_transcript(text)
    except llm.OllamaUnavailable as exc:
        raise HTTPException(
            503,
            "the local LLM service became unavailable while reading the "
            "transcript — nothing was saved, try again later",
        ) from exc
    except llm.OllamaBadResponse as exc:
        raise HTTPException(502, str(exc)) from exc

    if not rows:
        raise HTTPException(
            422,
            "no courses were found in this PDF — is it an unofficial transcript "
            "with per-quarter course tables?",
        )

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
    return {"matched": matched, "unmatched": unmatched, "warnings": []}
