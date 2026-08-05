"""Transcript-import tests. The LLM is always mocked (no network); the PDF
fixtures are synthesized in-test with entirely FAKE data — never real
transcript content."""

import threading
import time

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


# Fake student, fake ID, real-ish layout.
FAKE_TRANSCRIPT_LINES = [
    "Name: Slug, Sammy",
    "Student ID: 0000001",
    "Test Credits: Transfer Totals 44.000 44.000",
    "2021 Fall Quarter",
    "CSE 12 Systems and Assembly 7.00 7.00 A",
    "CSE 16 Discrete Math 5.00 5.00 P",
    "Term GPA 4.00 Term Totals 12.00 12.00",
    "2022 Winter Quarter",
    "CSE 30 Programming Abstractions 7.00 0.00 NP",
    "ANTH 2 Cultural Anthropology 5.00 0.00",
    "FAKE 101 Not In Catalog 5.00 5.00 A",
]

# [code, term, grade, earned, completed] — the shape the prompt asks for.
LLM_ANSWER = {
    "courses": [
        ["CSE 12", "2021 Fall", "A", 7.0, True],
        ["CSE 16", "2021 Fall", "P", 5.0, True],
        ["CSE 30", "2022 Winter", "NP", 0.0, False],
        ["ANTH 2", "2022 Winter", "", 0.0, False],
        ["FAKE 101", "2022 Winter", "A", 5.0, True],
    ]
}


@pytest.fixture()
def llm_up(monkeypatch):
    monkeypatch.setattr(llm, "check_available", lambda timeout=2.0: (True, "ok"))


@pytest.fixture()
def llm_answers(monkeypatch, llm_up):
    """Records every call so tests can assert the whole document goes in one."""
    calls = []

    def fake_chat_json(system_prompt, user_message, **kw):
        calls.append(user_message)
        return LLM_ANSWER

    monkeypatch.setattr(llm, "chat_json", fake_chat_json)
    return calls


def upload(client, data: bytes, name="transcript.pdf", mime="application/pdf"):
    return client.post("/u/ucsc/transcript/parse", files={"file": (name, data, mime)})


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


# --- parse: happy path -------------------------------------------------------


def test_parse_happy_path(client, seeded, llm_answers):
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 200, r.text
    body = r.json()

    by_code = {m["code"]: m for m in body["matched"]}
    # Matched rows carry the CATALOG title, not anything the model said.
    assert by_code["CSE12"]["title"] == "Systems and Assembly"
    assert by_code["CSE12"]["term"] == "2021 Fall"
    # The model's completed verdict is passed through as-is.
    assert by_code["CSE12"]["completed"] is True
    assert by_code["CSE16"]["completed"] is True
    assert by_code["CSE30"]["completed"] is False
    assert by_code["CSE30"]["grade"] == "NP"
    assert by_code["ANTH2"]["completed"] is False
    # Unknown course is reported raw, never silently added to the plan.
    assert body["unmatched"] == ["FAKE 101"]


def test_whole_document_goes_in_one_call(client, seeded, llm_answers):
    """No chunking: one call, carrying every term of the document."""
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 200
    assert len(llm_answers) == 1
    sent = llm_answers[0]
    assert "2021 Fall Quarter" in sent
    assert "2022 Winter Quarter" in sent


def test_parse_unknown_university(client, seeded, llm_answers):
    r = client.post(
        "/u/nope/transcript/parse",
        files={"file": ("t.pdf", make_pdf(FAKE_TRANSCRIPT_LINES), "application/pdf")},
    )
    assert r.status_code == 404


# --- parse: input rejection --------------------------------------------------


def test_parse_rejects_non_pdf(client, seeded, llm_up):
    r = upload(client, b"just some text", name="notes.txt", mime="text/plain")
    assert r.status_code == 415


def test_parse_rejects_pdf_extension_without_pdf_magic(client, seeded, llm_up):
    r = upload(client, b"NOT-A-PDF-AT-ALL")
    assert r.status_code == 415


def test_parse_rejects_oversize(client, seeded, llm_up, monkeypatch):
    monkeypatch.setattr(settings, "transcript_max_bytes", 2048)
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES, pad=8192))
    assert r.status_code == 413


def test_parse_rejects_textless_pdf(client, seeded, llm_up):
    """A scan has pages but no text layer — 422 with an actionable message."""
    r = upload(client, make_pdf([]))
    assert r.status_code == 422
    assert "scanned" in r.json()["detail"].lower()


def test_parse_reports_when_no_courses_found(client, seeded, llm_up, monkeypatch):
    monkeypatch.setattr(llm, "chat_json", lambda *a, **k: {"courses": []})
    r = upload(client, make_pdf(["Some document that is not a transcript"]))
    assert r.status_code == 422
    assert "no courses" in r.json()["detail"].lower()


# --- parse: LLM failure modes ------------------------------------------------


def test_parse_llm_down_refuses_503(client, seeded, monkeypatch):
    monkeypatch.setattr(llm, "check_available", lambda timeout=2.0: (False, "LLM service unreachable"))
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 503
    assert "unavailable" in r.json()["detail"]


def test_parse_llm_dies_mid_request_503(client, seeded, llm_up, monkeypatch):
    def boom(*a, **k):
        raise llm.OllamaUnavailable("LLM call failed: ConnectError")

    monkeypatch.setattr(llm, "chat_json", boom)
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 503


def test_parse_llm_garbage_502(client, seeded, llm_up, monkeypatch):
    monkeypatch.setattr(llm, "chat_json", lambda *a, **k: None)
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 502


def test_parse_llm_missing_courses_key_502(client, seeded, llm_up, monkeypatch):
    monkeypatch.setattr(llm, "chat_json", lambda *a, **k: {"result": "who knows"})
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 502


def test_error_responses_never_echo_transcript_text(client, seeded, llm_up, monkeypatch):
    monkeypatch.setattr(llm, "chat_json", lambda *a, **k: None)
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert "Sammy" not in r.text and "0000001" not in r.text


# --- row parsing -------------------------------------------------------------


def test_malformed_rows_are_skipped_not_fatal(client, seeded, llm_up, monkeypatch):
    """A row the model shapes wrongly costs that row, not the whole import."""
    monkeypatch.setattr(
        llm,
        "chat_json",
        lambda *a, **k: {
            "courses": [
                ["CSE 12", "2021 Fall", "A", 7.0, True],  # good
                ["CSE 16", "2021 Fall", "A"],  # too short
                {"code": "CSE 30"},  # object instead of array
                ["", "2021 Fall", "A", 5.0, True],  # empty code
                ["CSE 101", "2022 Fall", "B", "n/a", True],  # unparseable units
                "CSE 130",  # not a row at all
            ]
        },
    )
    body = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES)).json()
    codes = {m["code"] for m in body["matched"]}
    assert codes == {"CSE12", "CSE101"}
    units = {m["code"]: m["earned_units"] for m in body["matched"]}
    assert units["CSE101"] == 0.0  # coerced, not crashed


def test_normalize_code_matches_catalog_form():
    assert transcript.normalize_code("cse 30") == "CSE30"
    assert transcript.normalize_code("MATH 19A") == "MATH19A"


# --- concurrency / resource discipline ---------------------------------------


def test_llm_calls_are_serialized(monkeypatch):
    """Repo invariant #1: exactly one in-flight Ollama request, ever."""
    overlap = []
    active = []
    lock = threading.Lock()

    def fake_post(body, timeout):
        with lock:
            active.append(1)
            overlap.append(len(active))
        time.sleep(0.05)
        with lock:
            active.pop()
        return {"message": {"content": '{"courses": []}'}}

    monkeypatch.setattr(llm, "_post_chat", fake_post)
    threads = [threading.Thread(target=lambda: llm.chat_json("sys", "msg")) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert max(overlap) == 1


def test_parse_holds_no_db_connection_across_llm_work(client, seeded, llm_up, monkeypatch):
    """The LLM call takes tens of seconds; a pooled connection must not be
    pinned across it or unrelated endpoints starve."""
    checked = {}

    def fake_chat_json(system_prompt, user_message, **kw):
        # Mid-parse, an unrelated read must still work.
        checked["subjects"] = client.get("/u/ucsc/subjects").status_code
        return LLM_ANSWER

    monkeypatch.setattr(llm, "chat_json", fake_chat_json)
    r = upload(client, make_pdf(FAKE_TRANSCRIPT_LINES))
    assert r.status_code == 200
    assert checked["subjects"] == 200


def test_upload_over_one_mb_never_spools_to_disk(client, seeded, llm_answers, monkeypatch):
    """Starlette spools >1 MB parts to /tmp by default. The UI promises the
    transcript never touches the filesystem, so the parser must not roll over."""
    import tempfile

    rolled = []
    real_rollover = tempfile.SpooledTemporaryFile.rollover

    def spy(self):
        rolled.append(True)
        return real_rollover(self)

    monkeypatch.setattr(tempfile.SpooledTemporaryFile, "rollover", spy)
    big = make_pdf(FAKE_TRANSCRIPT_LINES, pad=2 * 1024 * 1024)
    assert len(big) > 1024 * 1024
    r = upload(client, big)
    assert r.status_code == 200
    assert rolled == []
