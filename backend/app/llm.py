"""Minimal Ollama chat client for the transcript-import feature.

The backend must not import from pipelines/, so the tuned knowledge from
pipelines/common/ollama.py lives here too:

- temperature=0, fixed seed: reproducibility.
- format="json" constrains decoding, but the model can still emit
  valid-but-wrong JSON — callers must schema-validate the result.
- think=False on hybrid-reasoning models: reasoning mode is far slower on a
  narrow extraction task for no accuracy gain. Models that don't know the
  parameter reject it, so it is only sent to families that do.

Sizing for the whole-document parse (gemma4:12b on a 16 GB card):
- num_ctx must hold the entire transcript plus the prompt. A 4-year MyUCSC
  export is ~12k chars / ~4k tokens; 16384 leaves room for longer records
  without pushing the KV cache off the GPU. Ollama's global
  OLLAMA_CONTEXT_LENGTH does not apply once we send num_ctx per request.
- num_predict must hold every course row at once. ~58 rows x ~28 tokens is
  ~1.7k; 4096 leaves headroom. Too low truncates the JSON array mid-row,
  which reads as "the model dropped courses" rather than as a config bug.
- keep_alive=-1 pins the model in VRAM so the ~34 s cold load is paid once
  per boot instead of once per import.

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

DEFAULT_NUM_CTX = 16384
DEFAULT_NUM_PREDICT = 4096

# Families that accept the `think` option. Others 400 on it.
_THINKING_FAMILIES = ("qwen3", "gemma4", "glm-4")


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
        "keep_alive": -1,
        "options": {
            "temperature": temperature,
            "num_ctx": num_ctx,
            "num_predict": num_predict,
            "seed": seed,
        },
    }
    if model.startswith(_THINKING_FAMILIES):
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
