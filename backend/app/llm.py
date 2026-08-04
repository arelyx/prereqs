"""Minimal Ollama chat client for the transcript-import feature.

Ported from pipelines/common/ollama.py (the tuned pipeline harness) — the
backend must not import from pipelines/. Tuning knowledge preserved:

- num_ctx=4096: sized to keep qwen3:4b fully in 4GB VRAM. Callers keep each
  input chunk small enough to fit (the transcript parser chunks per quarter).
- think=False for qwen3-family models: reasoning mode is ~50x slower on
  narrow extraction tasks for no accuracy gain. Other models reject the
  parameter, so it is only sent for qwen3*.
- temperature=0, fixed seed: reproducibility.
- format="json" constrains decoding, but the model can still emit
  valid-but-wrong JSON — callers must schema-validate the result.

Concurrency: exactly one in-flight Ollama request, ever (repo invariant #1 —
alternating prompts thrash the KV prefix cache, and the host GPU serves one
model at a time). ``_LLM_LOCK`` serializes every call; endpoints using this
module must be plain ``def`` routes so they run in the threadpool and block
on the lock without stalling the event loop.
"""

from __future__ import annotations

import json
import threading

import httpx

from .config import settings

_LLM_LOCK = threading.Lock()

DEFAULT_NUM_CTX = 4096
DEFAULT_NUM_PREDICT = 1024


class OllamaUnavailable(Exception):
    """Ollama is unreachable or the configured model is not present."""


class OllamaBadResponse(Exception):
    """Ollama answered, but not with usable JSON."""


def check_available(timeout: float = 2.0) -> tuple[bool, str]:
    """Fast reachability + model-presence probe. Returns (available, detail)."""
    try:
        resp = httpx.get(f"{settings.ollama_url}/api/tags", timeout=timeout)
        resp.raise_for_status()
        models = {m.get("name") for m in resp.json().get("models", [])}
    except Exception:
        return False, "LLM service unreachable"
    want = settings.transcript_llm_model
    if want not in models and want.split(":")[0] not in {m.split(":")[0] for m in models}:
        return False, f"model {want} not available"
    return True, "ok"


def _post_chat(body: dict, timeout: float) -> dict:
    """Single POST to /api/chat. Split out so tests can stub the network."""
    resp = httpx.post(f"{settings.ollama_url}/api/chat", json=body, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def chat_json(
    system_prompt: str,
    user_message: str,
    *,
    num_ctx: int = DEFAULT_NUM_CTX,
    num_predict: int = DEFAULT_NUM_PREDICT,
    seed: int = 42,
    temperature: float = 0.0,
    timeout: float | None = None,
) -> dict | None:
    """One structuring call. Returns parsed JSON dict, or None if the model
    emitted something unparseable. Raises OllamaUnavailable on network/server
    failure. Never logs or embeds the prompt/input (transcripts carry PII).
    """
    model = settings.transcript_llm_model
    body: dict = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "stream": False,
        "format": "json",
        "options": {
            "temperature": temperature,
            "num_ctx": num_ctx,
            "num_predict": num_predict,
            "seed": seed,
        },
    }
    if model.startswith("qwen3"):
        body["think"] = False
    with _LLM_LOCK:
        try:
            payload = _post_chat(body, timeout or settings.transcript_llm_timeout)
        except Exception as exc:
            # Deliberately does not include the request body (PII).
            raise OllamaUnavailable(f"LLM call failed: {type(exc).__name__}") from exc
    content = payload.get("message", {}).get("content", "")
    if not content:
        return None
    try:
        parsed = json.loads(content)
    except Exception:
        return None
    return parsed if isinstance(parsed, dict) else None
