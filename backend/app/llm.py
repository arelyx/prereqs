"""Minimal local-LLM chat client for the transcript-import feature.

Talks to an OpenAI-compatible server (llama.cpp ``llama-server``; on the dev
host: ``qwen3.8-27b`` on :8080). This is the ONLY place the app uses an LLM
at request time; the data pipelines are LLM-free.

- temperature=0, fixed seed: reproducibility.
- ``chat_template_kwargs.enable_thinking=false``: reasoning mode is far slower
  on narrow extraction for no accuracy gain (qwen3-family templates honor it,
  others ignore it).
- ``response_format=json_object`` is requested, but llama-server can still
  wrap the object in a Markdown fence, so the reply is fence-stripped before
  parsing; callers must schema-validate the result anyway.

Concurrency: exactly one in-flight LLM request, ever. The dev host's server
runs ``--parallel 1`` and the GPU serves one model, so ``_LLM_LOCK``
serializes every call; endpoints using this module must be plain ``def``
routes so they block on the lock in the threadpool, not the event loop.
"""

from __future__ import annotations

import json
import re
import threading

import httpx

from .config import settings

_LLM_LOCK = threading.Lock()

DEFAULT_MAX_TOKENS = 1024

_FENCE = re.compile(r"^\s*```(?:json)?\s*(.*?)\s*```\s*$", re.DOTALL)


class LLMUnavailable(Exception):
    """The LLM server is unreachable or the configured model is not served."""


class LLMBadResponse(Exception):
    """The LLM answered, but not with usable JSON."""


def check_available(timeout: float = 2.0) -> tuple[bool, str]:
    """Fast reachability + model-presence probe. Returns (available, detail)."""
    try:
        resp = httpx.get(f"{settings.llm_url}/v1/models", timeout=timeout)
        resp.raise_for_status()
        served = {m.get("id") for m in resp.json().get("data", [])}
    except Exception:
        return False, "LLM service unreachable"
    if settings.transcript_llm_model not in served:
        return False, f"model {settings.transcript_llm_model} not available"
    return True, "ok"


def _post_chat(body: dict, timeout: float) -> dict:
    """Single POST to /v1/chat/completions. Split out so tests can stub it."""
    resp = httpx.post(f"{settings.llm_url}/v1/chat/completions", json=body, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def parse_json_reply(content: str) -> dict | None:
    """Parse a model reply as a JSON object, tolerating a Markdown fence."""
    m = _FENCE.match(content)
    if m:
        content = m.group(1)
    try:
        parsed = json.loads(content)
    except Exception:
        return None
    return parsed if isinstance(parsed, dict) else None


def chat_json(
    system_prompt: str,
    user_message: str,
    *,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    seed: int = 42,
    temperature: float = 0.0,
    timeout: float | None = None,
) -> dict | None:
    """One structuring call. Returns parsed JSON dict, or None if the model
    emitted something unparseable. Raises LLMUnavailable on network/server
    failure. Never logs or embeds the prompt/input (transcripts carry PII).
    """
    body: dict = {
        "model": settings.transcript_llm_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "stream": False,
        "temperature": temperature,
        "seed": seed,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
        "chat_template_kwargs": {"enable_thinking": False},
    }
    with _LLM_LOCK:
        try:
            payload = _post_chat(body, timeout or settings.transcript_llm_timeout)
        except Exception as exc:
            # Deliberately does not include the request body (PII).
            raise LLMUnavailable(f"LLM call failed: {type(exc).__name__}") from exc
    try:
        content = payload["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError):
        return None
    return parse_json_reply(content) if content else None
