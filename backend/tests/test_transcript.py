"""Transcript-import tests. The LLM is always mocked (no network); the PDF
fixtures are synthesized in-test with entirely FAKE data — never real
transcript content."""

import threading
import time
import zlib

import pytest

from app import llm, transcript
from app.config import settings


# --- tiny in-memory PDF builder (text layer via Tj operators) ---------------


def _assemble(objects: list[bytes]) -> bytes:
    out = b"%PDF-1.4\n"
    offsets = []
    for i, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % i + obj + b"\nendobj\n"
    xref_pos = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    for off in offsets:
        out += b"%010d 00000 n \n" % off
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (
        len(objects) + 1,
        xref_pos,
    )
    return out


def _text_stream(lines: list[str]) -> bytes:
    def esc(s: str) -> str:
        return s.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")

    return (
        "BT /F1 9 Tf 36 750 Td 11 TL "
        + " ".join(f"({esc(line)}) Tj T*" for line in lines)
        + " ET"
    ).encode()


def make_pdf(lines: list[str], pad: int = 0) -> bytes:
    """One-page PDF with an uncompressed text layer. `pad` appends that many
    bytes of unreferenced filler, to grow the upload without growing the text."""
    content = _text_stream(lines)
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(content) + content + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    if pad:
        objects.append(b"<< /Length %d >>\nstream\n" % pad + b"P" * pad + b"\nendstream")
    return _assemble(objects)


def _form_ops(n_bytes: int) -> bytes:
    """Operator soup that produces no text whatsoever: pure graphics-state
    churn. Deliberately contains no `cm`, `BT`/`ET` or `Tf` — those flush text
    and would call `visitor_text`, which was the only place the clock used to
    be sampled. A bomb's operators never call it."""
    unit = b"q Q 0.5 w 1 J 1 j 0 g 0 0 0 RG "
    return unit * max(1, n_bytes // len(unit))


def make_xobject_bomb(form_bytes: int, do_count: int = 1, chain: int = 1) -> bytes:
    """One page whose *content stream is tiny* but which invokes a Form
    XObject carrying `form_bytes` of operators, `do_count` times.

    This is the bypass: page-level accounting measures `page['/Contents']`,
    which here is ~20 bytes, while pypdf walks megabytes through
    `extract_xform_text`. `chain > 1` makes each form `Do` the next one, so
    the walk recurses. The form must carry a non-empty /Resources or pypdf
    short-circuits before walking anything.
    """
    body = _form_ops(form_bytes)
    first_form = 6
    xobj_dict = b" ".join(b"/X%d %d 0 R" % (j, first_form + j) for j in range(chain))

    forms = []
    for i in range(chain):
        data = body + (b" /X%d Do " % (i + 1) if i + 1 < chain else b"")
        comp = zlib.compress(data, 9)
        forms.append(
            b"<< /Type /XObject /Subtype /Form /BBox [0 0 612 792] "
            b"/Resources << /Font << /F1 5 0 R >> /XObject << " + xobj_dict + b" >> >> "
            b"/Length %d /Filter /FlateDecode >>\nstream\n" % len(comp) + comp + b"\nendstream"
        )

    page_content = b" ".join([b"/X0 Do"] * do_count)
    return _assemble(
        [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
            b"/Resources << /Font << /F1 5 0 R >> /XObject << " + xobj_dict + b" >> >> >>",
            b"<< /Length %d >>\nstream\n" % len(page_content) + page_content + b"\nendstream",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        ]
        + forms
    )


def make_flate_pdf(lines: list[str], pages: int = 1) -> bytes:
    """A PDF bomb: tiny on the wire, enormous once pypdf inflates the content
    stream it has to walk. This is the shape that returned a normal-looking
    200 after 262 seconds of single-threaded CPU."""
    comp = zlib.compress(_text_stream(lines), 6)
    kids = b" ".join(b"%d 0 R" % (5 + i) for i in range(pages))
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [" + kids + b"] /Count %d >>" % pages,
        b"<< /Length %d /Filter /FlateDecode >>\nstream\n" % len(comp) + comp + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    objects += [
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 3 0 R /Resources << /Font << /F1 4 0 R >> >> >>"
    ] * pages
    return _assemble(objects)


# Filler shaped like a course row, so a rejection can never be blamed on the
# text being unparseable rather than on its sheer volume.
BOMB_LINE = "CSE 12 Com Sys Assmbly Lan padding padding padding 7.00 7.00 A 28.000"


FAKE_TRANSCRIPT_LINES = [
    "*** U N O F F I C I A L ***",
    "Name: Slug, Sammy",
    "Student ID: 0000001",
    "Test Credits Applied Toward Undergraduate Program",
    "Test Trans GPA: 0.000 Transfer Totals: 44.000 44.000 0.000",
    "2021 Fall Quarter",
    "Program: Undergraduate",
    "Course Description Attempted Earned Grade Points",
    "CSE 12 Com Sys/Assmbly Lan 7.00 7.00 A+ 28.000",
    "FAKE 101 Not A Real Course 5.00 5.00 A 20.000",
    "Term GPA 4.00 Term Totals 12.00 12.00 12.00 48.000",
    "2022 Winter Quarter",
    "Course Description Attempted Earned Grade Points",
    "CSE 30 Prog Abs Python 7.00 0.00 NP 0.000",
    "CSE 16 Appl Discrete Math 5.00 5.00 P 0.000",
    "ANTH 2 Cultural Anthropology 5.00 0.00 0.000",
    "Term GPA 0.00 Term Totals 17.00 5.00 0.00 0.000",
    "Undergraduate Career Totals",
    "End of *** U N O F F I C I A L ***",
]

CHUNK_ANSWERS = {
    "2021 Fall": {
        "courses": [
            {"code": "CSE 12", "title": "Com Sys/Assmbly Lan", "attempted": 7.0, "earned": 7.0, "grade": "A+"},
            {"code": "FAKE 101", "title": "Not A Real Course", "attempted": 5.0, "earned": 5.0, "grade": "A"},
        ]
    },
    "2022 Winter": {
        "courses": [
            {"code": "CSE 30", "title": "Prog Abs Python", "attempted": 7.0, "earned": 0.0, "grade": "NP"},
            {"code": "CSE 16", "title": "Appl Discrete Math", "attempted": 5.0, "earned": 5.0, "grade": "P"},
            {"code": "ANTH 2", "title": "Cultural Anthropology", "attempted": 5.0, "earned": 0.0, "grade": ""},
        ]
    },
}


@pytest.fixture()
def llm_up(monkeypatch):
    monkeypatch.setattr(llm, "check_available", lambda timeout=2.0: (True, "ok"))


@pytest.fixture()
def llm_answers(monkeypatch, llm_up):
    calls = []

    def fake_chat_json(system_prompt, user_message, **kw):
        calls.append(user_message)
        for term, answer in CHUNK_ANSWERS.items():
            if user_message.startswith(term):
                return answer
        return {"courses": []}

    monkeypatch.setattr(llm, "chat_json", fake_chat_json)
    return calls


def upload(client, data: bytes, name="transcript.pdf", mime="application/pdf"):
    return client.post(
        "/u/ucsc/transcript/parse", files={"file": (name, data, mime)}
    )


# --- status ------------------------------------------------------------------


def test_status_available(client, monkeypatch):
    class Resp:
        def raise_for_status(self):
            pass

        def json(self):
            return {"models": [{"name": settings.transcript_llm_model}]}

    monkeypatch.setattr(llm.httpx, "get", lambda *a, **k: Resp())
    body = client.get("/transcript/status").json()
    assert body["available"] is True
    assert body["model"] == settings.transcript_llm_model


def test_status_unavailable(client, monkeypatch):
    def boom(*a, **k):
        raise OSError("connection refused")

    monkeypatch.setattr(llm.httpx, "get", boom)
    body = client.get("/transcript/status").json()
    assert body["available"] is False
    assert body["model"] is None


def test_status_model_missing(client, monkeypatch):
    class Resp:
        def raise_for_status(self):
            pass

        def json(self):
            return {"models": [{"name": "some-other-model:1b"}]}

    monkeypatch.setattr(llm.httpx, "get", lambda *a, **k: Resp())
    body = client.get("/transcript/status").json()
    assert body["available"] is False
    assert "not available" in body["detail"]


# --- parse: happy path and edge semantics ------------------------------------


def test_parse_happy_path(client, seeded, llm_answers):
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 200, r.text
    body = r.json()

    by_code = {m["code"]: m for m in body["matched"]}
    # Completed row: matched to the catalog with the catalog title.
    assert by_code["CSE12"]["completed"] is True
    assert by_code["CSE12"]["title"] == "Systems and Assembly"
    assert by_code["CSE12"]["term"] == "2021 Fall"
    # P grade with earned units IS completed.
    assert by_code["CSE16"]["completed"] is True
    # NP with 0 earned is NOT completed (still shown, flagged).
    assert by_code["CSE30"]["completed"] is False
    assert by_code["CSE30"]["grade"] == "NP"
    # No grade printed (in progress) is NOT completed.
    assert by_code["ANTH2"]["completed"] is False
    # Unknown course is reported raw, never silently added.
    assert body["unmatched"] == ["FAKE 101"]
    assert body["warnings"] == []
    # One serial LLM call per quarter section, none for the header/transfer
    # preamble (no fabricated courses from the 44-unit transfer totals).
    assert len(llm_answers) == 2


def test_parse_unknown_university(client, seeded, llm_answers):
    r = client.post(
        "/u/nowhere/transcript/parse",
        files={"file": ("t.pdf", make_pdf(FAKE_TRANSCRIPT_LINES), "application/pdf")},
    )
    assert r.status_code == 404


# --- parse: input rejection --------------------------------------------------


def test_parse_rejects_non_pdf(client, seeded, llm_up):
    r = upload(client, b"just some text", name="notes.txt", mime="text/plain")
    assert r.status_code == 415
    # PDF-labeled but not actually a PDF: also refused.
    r = upload(client, b"<html>hi</html>")
    assert r.status_code == 415


def test_parse_rejects_oversize(client, seeded, llm_up, monkeypatch):
    monkeypatch.setattr(settings, "transcript_max_bytes", 1000)
    r = upload(client, b"%PDF-" + b"x" * 2000)
    assert r.status_code == 413


def test_parse_rejects_textless_pdf(client, seeded, llm_up):
    r = upload(client, make_pdf([]))
    assert r.status_code == 422
    assert "scanned image" in r.json()["detail"]


def test_parse_rejects_non_transcript_pdf(client, seeded, llm_up, monkeypatch):
    monkeypatch.setattr(
        llm, "chat_json", lambda *a, **k: pytest.fail("LLM must not be called")
    )
    r = upload(client, make_pdf(["A grocery list", "eggs", "milk"]))
    assert r.status_code == 422
    assert "quarter" in r.json()["detail"]


# --- parse: LLM failure modes ------------------------------------------------


def test_parse_llm_down_refuses_503(client, seeded, monkeypatch):
    monkeypatch.setattr(
        llm, "check_available", lambda timeout=2.0: (False, "LLM service unreachable")
    )
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 503
    assert "unavailable" in r.json()["detail"]


def test_parse_llm_dies_mid_request_503(client, seeded, llm_up, monkeypatch):
    def dead(*a, **k):
        raise llm.OllamaUnavailable("LLM call failed: ConnectError")

    monkeypatch.setattr(llm, "chat_json", dead)
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 503


def test_parse_llm_garbage_502_after_one_retry(client, seeded, llm_up, monkeypatch):
    calls = []

    def garbage(*a, **k):
        calls.append(1)
        return {"courses": "not a list"}

    monkeypatch.setattr(llm, "chat_json", garbage)
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 502
    assert len(calls) == 2  # first chunk: one attempt + exactly one retry

    # Fabricated rows (codes absent from the section text) are garbage too.
    calls.clear()
    monkeypatch.setattr(
        llm,
        "chat_json",
        lambda *a, **k: (
            calls.append(1),
            {"courses": [{"code": "EVIL 666", "earned": 5.0, "grade": "A"}]},
        )[1],
    )
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 502
    assert len(calls) == 2


# --- unit-level: completion semantics, chunking, lock ------------------------


def test_is_completed_rules():
    assert transcript.is_completed("A", 5.0)
    assert transcript.is_completed("P", 5.0)
    assert transcript.is_completed("S", 3.0)
    assert transcript.is_completed("D-", 5.0)
    assert not transcript.is_completed("NP", 0.0)
    assert not transcript.is_completed("F", 0.0)
    assert not transcript.is_completed("W", 0.0)
    assert not transcript.is_completed("U", 0.0)
    assert not transcript.is_completed("", 0.0)  # in progress
    assert not transcript.is_completed("", None)
    assert not transcript.is_completed("A", 0.0)  # no earned units


def test_validate_chunk_sanitizes_points_column_as_grade():
    """Seen live: on in-progress rows (no grade printed) the model copies the
    points column ('0.000') into the grade field. That must read as
    no-grade/in-progress, not break the chunk."""
    chunk = transcript.TermChunk(
        term="2026 Spring", text="CSE 220 Comp Architecture 5.00 0.00 0.000"
    )
    rows = transcript._validate_chunk(
        {"courses": [{"code": "CSE 220", "earned": 0.0, "grade": "0.000"}]}, chunk
    )
    assert rows is not None
    assert rows[0].grade == "" and rows[0].completed is False


def test_validate_chunk_trims_title_glued_to_code():
    """Seen live with qwen3:4b: the code field comes back as
    'CRWN 1 ALE:Emerging Tech'. Salvage the leading code; still require it to
    exist in the section text."""
    chunk = transcript.TermChunk(
        term="2021 Fall", text="CRWN 1 ALE:Emerging Tech 5.00 5.00 A+ 20.000"
    )
    rows = transcript._validate_chunk(
        {"courses": [{"code": "CRWN 1 ALE:Emerging Tech", "earned": 5.0, "grade": "A+"}]},
        chunk,
    )
    assert rows is not None and rows[0].code == "CRWN1" and rows[0].raw_code == "CRWN 1"
    assert rows[0].completed is True


def test_split_terms_drops_preamble_and_totals():
    text = "\n".join(FAKE_TRANSCRIPT_LINES)
    chunks = transcript.split_terms(text)
    assert [c.term for c in chunks] == ["2021 Fall", "2022 Winter"]
    # Identity header and transfer totals never reach the LLM.
    assert "Student ID" not in chunks[0].text
    assert "Transfer Totals: 44" not in chunks[0].text
    # Trailing career totals are trimmed off the last chunk.
    assert "Career Totals" not in chunks[1].text


def test_llm_serialization_lock(monkeypatch):
    """chat_json must hold the module-level lock while the request is in
    flight — exactly one in-flight Ollama call, ever (repo invariant #1)."""
    assert isinstance(llm._LLM_LOCK, type(threading.Lock()))
    seen = {}

    def fake_post(body, timeout):
        seen["locked_during_call"] = llm._LLM_LOCK.locked()
        return {"message": {"content": '{"courses": []}'}}

    monkeypatch.setattr(llm, "_post_chat", fake_post)
    out = llm.chat_json("sys", "user")
    assert out == {"courses": []}
    assert seen["locked_during_call"] is True
    assert not llm._LLM_LOCK.locked()  # released afterwards


# --- resource discipline: long parses must not pin scarce resources ----------


def test_parse_holds_no_db_connection_across_llm_work(client, seeded, llm_up, monkeypatch):
    """A parse waits on the LLM for tens of seconds. Holding a pooled DB
    connection across that pins it 'idle in transaction' and starves every
    other endpoint (observed: QueuePool-timeout 500s on unrelated reads).
    No session may be open while the LLM work runs."""
    from app.db import get_session_factory

    inner = client.app.dependency_overrides[get_session_factory]()
    depth = {"now": 0, "max_during_llm": 0, "llm_calls": 0}

    class CountingSession:
        def __enter__(self):
            depth["now"] += 1
            return inner().__enter__()

        def __exit__(self, *exc):
            depth["now"] -= 1
            return False

    client.app.dependency_overrides[get_session_factory] = lambda: CountingSession

    def watching_chat_json(system_prompt, user_message, **kw):
        depth["llm_calls"] += 1
        depth["max_during_llm"] = max(depth["max_during_llm"], depth["now"])
        return {"courses": []}

    monkeypatch.setattr(llm, "chat_json", watching_chat_json)

    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 200, r.text
    assert depth["llm_calls"] > 0  # the LLM really ran
    assert depth["max_during_llm"] == 0  # ...with no DB session held
    assert depth["now"] == 0  # and nothing leaked


def test_parse_sheds_load_when_all_slots_busy(client, seeded, llm_answers):
    """In-flight parses are capped. The cap is refused honestly with 429 +
    Retry-After rather than queueing (a deep queue pins threadpool threads
    that the sync endpoints share)."""
    from app.api import transcript as api_transcript

    held = []
    try:
        while api_transcript._PARSE_SLOTS.acquire(blocking=False):
            held.append(1)
        assert held, "semaphore should have had capacity to drain"

        r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
        assert r.status_code == 429, r.text
        assert r.headers.get("Retry-After") == "60"
        # No transcript content leaks into the shed-load message.
        assert "CSE" not in r.json()["detail"]
    finally:
        for _ in held:
            api_transcript._PARSE_SLOTS.release()

    # Capacity restored: the next request succeeds normally.
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 200, r.text


def test_parse_slot_released_on_failure(client, seeded, llm_up, monkeypatch):
    """A failed parse must not leak its slot."""
    from app.api import transcript as api_transcript

    def boom(*a, **kw):
        raise llm.OllamaUnavailable("down")

    monkeypatch.setattr(llm, "chat_json", boom)
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 503

    # All slots must be free again.
    got = 0
    while api_transcript._PARSE_SLOTS.acquire(blocking=False):
        got += 1
    for _ in range(got):
        api_transcript._PARSE_SLOTS.release()
    assert got == settings.transcript_max_concurrent


# --- bounded PDF extraction --------------------------------------------------
# pypdf is pure Python: extraction holds the worker's GIL, and its cost is
# superlinear in the *decompressed* content stream, which the upload cap does
# not bound at all (compression ratio is the attacker's free variable).
# Measured on this builder, unbounded: 2.2 MB stream = 1.80 s, 8.9 MB = 19.1 s,
# 23 MB (a 80 KB upload) > 400 s. Every bound below must fire *during*
# extraction, not after it.


def _drain_slots():
    from app.api import transcript as api_transcript

    got = 0
    while api_transcript._PARSE_SLOTS.acquire(blocking=False):
        got += 1
    for _ in range(got):
        api_transcript._PARSE_SLOTS.release()
    return got


def test_parse_rejects_pdf_bomb_quickly(client, seeded, llm_up, monkeypatch):
    """A tiny upload with a huge text layer is refused cleanly and fast — not
    with a 500, and not with a 200 after four minutes of burnt CPU."""
    monkeypatch.setattr(
        llm, "chat_json", lambda *a, **k: pytest.fail("LLM must not be called")
    )
    bomb = make_flate_pdf(["2021 Fall Quarter"] + [BOMB_LINE] * 120_000)
    assert len(bomb) < 64 * 1024  # trivially small on the wire

    started = time.monotonic()
    r = upload(client, bomb)
    elapsed = time.monotonic() - started

    assert r.status_code == 422, r.text
    detail = r.json()["detail"]
    assert "too large or too complex" in detail
    assert "CSE" not in detail  # never echoes what was uploaded
    # Unbounded, this exact file took ~19 s; a 250k-line one took over 400 s.
    assert elapsed < 3.0, f"bomb took {elapsed:.1f}s to reject"


def test_parse_rejects_too_many_pages(client, seeded, llm_up, monkeypatch):
    """The page cap is its own bound: a page count that would take forever is
    refused before a single page is extracted."""
    monkeypatch.setattr(settings, "transcript_max_pages", 3)
    r = upload(client, make_flate_pdf(["2021 Fall Quarter"], pages=8))
    assert r.status_code == 422, r.text
    assert "8 pages" in r.json()["detail"]


def test_parse_rejects_over_char_cap(client, seeded, llm_up, monkeypatch):
    """The extracted-character cap is its own bound, independent of page count
    and stream size."""
    monkeypatch.setattr(llm, "chat_json", lambda *a, **k: pytest.fail("no LLM"))
    monkeypatch.setattr(settings, "transcript_max_text_chars", 200)
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 422, r.text
    assert "too large or too complex" in r.json()["detail"]


def test_extract_char_cap_aborts_mid_page(monkeypatch):
    """The cap has to abort the page in flight. Checking the total only after
    `extract_text()` returned would mean the expensive work already happened —
    exactly the bug. Proven by wall clock: capping at a fraction of the text
    must cost a matching fraction of the time."""
    pdf = make_flate_pdf(["2021 Fall Quarter"] + [BOMB_LINE] * 10_000)
    huge = 1 << 40

    started = time.monotonic()
    full = transcript.extract_pdf_text(pdf, max_chars=huge, max_stream_bytes=huge)
    full_time = time.monotonic() - started
    assert len(full) > 500_000

    started = time.monotonic()
    with pytest.raises(transcript.TranscriptError, match="too large or too complex"):
        transcript.extract_pdf_text(pdf, max_chars=20_000, max_stream_bytes=huge)
    capped_time = time.monotonic() - started

    assert capped_time < full_time / 3, (
        f"capped extraction took {capped_time:.3f}s vs {full_time:.3f}s uncapped — "
        "the cap is not aborting mid-page"
    )


def test_extraction_runs_inside_the_concurrency_cap(client, seeded, llm_up, monkeypatch):
    """Extraction used to run *before* the slot acquire, so the cap bounded
    nothing that mattered: 45 concurrent bombs all extracted at once and
    exhausted the anyio threadpool (a /health that touches no DB timed out at
    60 s). With every slot held, an upload must be shed before any extraction."""
    from app.api import transcript as api_transcript

    extracted = []
    real = transcript.extract_pdf_text
    monkeypatch.setattr(
        transcript,
        "extract_pdf_text",
        lambda *a, **kw: (extracted.append(1), real(*a, **kw))[1],
    )

    held = []
    try:
        while api_transcript._PARSE_SLOTS.acquire(blocking=False):
            held.append(1)
        assert held
        r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
        assert r.status_code == 429, r.text
        assert extracted == [], "extraction ran despite the cap being full"
    finally:
        for _ in held:
            api_transcript._PARSE_SLOTS.release()


def test_slots_survive_repeated_extraction_failures(client, seeded, llm_answers):
    """Extraction now happens inside the slot, so its failure paths must
    release it. Otherwise a handful of bad uploads permanently wedges the
    feature at zero capacity."""
    bomb = make_flate_pdf(["2021 Fall Quarter"] + [BOMB_LINE] * 120_000)
    for _ in range(6):  # more than transcript_max_concurrent
        assert upload(client, bomb).status_code == 422

    assert _drain_slots() == settings.transcript_max_concurrent
    # ...and a real transcript still gets through afterwards.
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 200, r.text


# --- form XObjects: the same bomb, one level of indirection away -------------
# `Do` sends pypdf into a form XObject's operator stream through
# `extract_xform_text`, which never touches `page['/Contents']` — so page-level
# byte accounting saw ~20 bytes while megabytes were walked. And pypdf drops
# the form from its cyclic-reference guard in a `finally`, so N `Do`s at one
# form walk it N times. Measured against the pre-fix code: a 1 MB form cost
# 0.65 s per `Do`, perfectly linear and unbounded — Do x16 in a 3.4 KB upload
# burned 9.65 s, and the 5 s deadline never fired because it was only sampled
# between pages and inside the text visitor, which a text-free operator stream
# never triggers.


def test_extract_rejects_form_xobject_bomb(monkeypatch):
    """A large operator stream reached only through `Do` must be charged to
    the same budget as a page's own contents. Pre-fix this returned the
    'no extractable text' 422 — after burning ~7 s on a 26 KB file."""
    bomb = make_xobject_bomb(10 * 1024 * 1024)
    assert len(bomb) < 64 * 1024  # tiny on the wire

    started = time.monotonic()
    with pytest.raises(transcript.TranscriptError, match="too large or too complex"):
        transcript.extract_pdf_text(bomb)
    elapsed = time.monotonic() - started
    # Unbounded, this file took 6.87 s (and 586 MB of RSS).
    assert elapsed < 1.0, f"form bomb took {elapsed:.2f}s to reject"


def test_extract_rejects_repeated_do_at_one_form(monkeypatch):
    """The `Do`xN vector: one page, one modest form, many invocations. Nothing
    here is individually over any cap — the cost is in the repetition, so each
    traversal has to be charged separately."""
    bomb = make_xobject_bomb(1024 * 1024, do_count=16)
    assert len(bomb) < 8 * 1024

    started = time.monotonic()
    with pytest.raises(transcript.TranscriptError, match="too large or too complex"):
        transcript.extract_pdf_text(bomb)
    elapsed = time.monotonic() - started
    # Pre-fix: 0.65 s per Do, linear and unbounded — 9.65 s at x16, and
    # Do x1000 in a 10 KB file reproduces the original 82-minute bug. The wall
    # clock is the assertion that catches a regression here, not the status.
    assert elapsed < 1.5, f"Do x16 took {elapsed:.2f}s to reject"


def test_extract_bounds_do_repetition_flat_not_linear():
    """Cost must stop scaling with the `Do` count. Same form, 1 vs 32
    invocations: pre-fix that was a 32x difference in CPU."""
    once = make_xobject_bomb(512 * 1024, do_count=1)
    many = make_xobject_bomb(512 * 1024, do_count=32)

    started = time.monotonic()
    try:
        transcript.extract_pdf_text(once)
    except transcript.TranscriptError:
        pass
    one_time = time.monotonic() - started

    started = time.monotonic()
    with pytest.raises(transcript.TranscriptError, match="too large or too complex"):
        transcript.extract_pdf_text(many)
    many_time = time.monotonic() - started

    assert many_time < one_time * 6 + 0.5, (
        f"32 x Do cost {many_time:.2f}s vs {one_time:.2f}s for one — still linear "
        "in the repetition count"
    )


def test_extract_terminates_on_nested_xobjects():
    """A form that `Do`s another form recurses. It must terminate cleanly on
    the budget, never on a RecursionError (which reads as a corrupt PDF) and
    never on an unbounded walk."""
    nested = make_xobject_bomb(512 * 1024, chain=8)
    started = time.monotonic()
    with pytest.raises(transcript.TranscriptError, match="too large or too complex"):
        transcript.extract_pdf_text(nested)
    assert time.monotonic() - started < 2.0

    # Deeper than the depth cap, cheap per level: refused on depth alone.
    deep = make_xobject_bomb(256, chain=64)
    started = time.monotonic()
    with pytest.raises(transcript.TranscriptError, match="too large or too complex"):
        transcript.extract_pdf_text(deep)
    assert time.monotonic() - started < 1.0


def test_extract_caps_traversals_of_a_costless_form():
    """Byte-charging alone cannot see the fixed per-traversal cost (ContentStream
    build + font table load). A near-empty form invoked tens of thousands of
    times is charged ~no bytes, so the traversal cap is what bounds it."""
    bomb = make_xobject_bomb(1, do_count=50_000)
    started = time.monotonic()
    with pytest.raises(transcript.TranscriptError, match="too large or too complex"):
        transcript.extract_pdf_text(bomb)
    assert time.monotonic() - started < 1.0


def test_form_traversals_are_charged(monkeypatch):
    """Pins the pypdf hook: form recursion goes through
    `PageObject.extract_xform_text`. If a pypdf upgrade renames it, byte
    accounting silently stops covering forms — so fail here, loudly."""
    from pypdf import PageObject

    assert hasattr(PageObject, "extract_xform_text")

    seen = []
    real_bind = transcript._bind_form_accounting

    def spy(page, budget):
        real_bind(page, budget)
        seen.append(budget)

    monkeypatch.setattr(transcript, "_bind_form_accounting", spy)
    with pytest.raises(transcript.TranscriptError):
        transcript.extract_pdf_text(make_xobject_bomb(512 * 1024, do_count=8))
    assert seen and seen[0].traversals > 0, "no form traversal was ever charged"
    assert seen[0].stream_used > 512 * 1024, "form bytes were not charged"


def test_extract_deadline_fires_inside_a_form_walk():
    """With byte accounting deliberately disabled, the clock alone must still
    stop a form walk. Pre-fix nothing checked the clock during an in-page
    operator walk, so this ran to completion: 1 MB per `Do` x64 = ~41 s."""
    monster = make_xobject_bomb(1024 * 1024, do_count=64)
    huge = 1 << 40

    started = time.monotonic()
    with pytest.raises(transcript.TranscriptError, match="too large or too complex"):
        transcript.extract_pdf_text(
            monster,
            max_stream_bytes=huge,
            max_xobject_traversals=1 << 20,
            time_budget=1.0,
        )
    elapsed = time.monotonic() - started
    assert elapsed < 3.0, f"deadline did not fire during the form walk ({elapsed:.2f}s)"


def test_parse_rejects_form_xobject_bomb_end_to_end(client, seeded, llm_up, monkeypatch):
    """Through the endpoint: 422, fast, no 500, and nothing about the file's
    contents in the message."""
    monkeypatch.setattr(llm, "chat_json", lambda *a, **k: pytest.fail("no LLM"))
    bomb = make_xobject_bomb(2 * 1024 * 1024, do_count=8)

    started = time.monotonic()
    r = upload(client, bomb)
    elapsed = time.monotonic() - started

    assert r.status_code == 422, r.text
    assert "too large or too complex" in r.json()["detail"]
    assert elapsed < 2.0, f"took {elapsed:.2f}s"
    assert _drain_slots() == settings.transcript_max_concurrent


def test_real_transcript_shape_keeps_full_headroom():
    """The bounds must not be tight on the thing they exist to let through.
    Reference: the real 794 KB MyUCSC export is 7 pages / 439 KB of streams /
    11,853 chars / 0.19 s, and uses no form XObjects at all."""
    pdf = make_flate_pdf(FAKE_TRANSCRIPT_LINES, pages=7)
    started = time.monotonic()
    text = transcript.extract_pdf_text(pdf)
    assert "2021 Fall Quarter" in text
    assert time.monotonic() - started < 1.0


# --- "never written to disk" must be literally true --------------------------


def test_upload_over_one_mb_never_spools_to_disk(client, seeded, llm_answers, monkeypatch):
    """Starlette's multipart parser rolls any upload over `spool_max_size`
    (default 1 MB) into a /tmp file BEFORE the endpoint runs — observed as 31
    deleted-but-open fds holding a real transcript. The UI promises the PDF is
    never stored, so rollover has to be unreachable, not merely unlikely."""
    import starlette.formparsers as fp

    from app.api.transcript import _InMemoryMultiPartParser

    # No upload we accept can reach the rollover threshold.
    assert _InMemoryMultiPartParser.spool_max_size > settings.transcript_max_bytes

    class NoDiskSpool(fp.SpooledTemporaryFile):
        def rollover(self):  # pragma: no cover - the assertion is the point
            raise AssertionError("upload spilled to disk")

    monkeypatch.setattr(fp, "SpooledTemporaryFile", NoDiskSpool)

    big = make_pdf(FAKE_TRANSCRIPT_LINES, pad=2 * 1024 * 1024)
    assert len(big) > 1024 * 1024  # over the default spool threshold
    r = upload(client, big)
    assert r.status_code == 200, r.text


def test_oversize_body_is_refused_while_still_arriving(client, seeded, llm_up, monkeypatch):
    """Over-cap uploads are cut off mid-stream rather than fully buffered."""
    monkeypatch.setattr(settings, "transcript_max_bytes", 1000)
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES, pad=512 * 1024))
    assert r.status_code == 413, r.text
