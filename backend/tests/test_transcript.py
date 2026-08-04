"""Transcript-import tests. The LLM is always mocked (no network); the PDF
fixtures are synthesized in-test with entirely FAKE data — never real
transcript content."""

import threading

import pytest

from app import llm, transcript
from app.config import settings


# --- tiny in-memory PDF builder (text layer via Tj operators) ---------------


def make_pdf(lines: list[str]) -> bytes:
    def esc(s: str) -> str:
        return s.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")

    content = (
        "BT /F1 9 Tf 36 750 Td 11 TL "
        + " ".join(f"({esc(line)}) Tj T*" for line in lines)
        + " ET"
    )
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(content)} >>\nstream\n{content}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = b"%PDF-1.4\n"
    offsets = []
    for i, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n{obj}\nendobj\n".encode()
    xref_pos = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n"
    ).encode()
    return out


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
