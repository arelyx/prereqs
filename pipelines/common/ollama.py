"""Local-LLM (Ollama) client for structuring tasks.

Ported from the POC's tuned harness (prereqs-archive yoink/ollama_core.py).
Key tuning knowledge preserved:

- num_ctx=4096: sized to fit qwen3:4b fully in 4GB VRAM with room for a ~1.5k
  token system prompt plus a long input and its output. 2048 truncated complex
  courses into empty/invalid JSON; 4096 keeps the model 100% on-GPU (~3.6GB).
  A global OLLAMA_CONTEXT_LENGTH env larger than this must be overridden per
  request or the KV cache spills to CPU.
- think=False for qwen3: reasoning mode is ~50x slower on these narrow
  extraction tasks for no accuracy gain.
- temperature=0, fixed seed: we want reproducibility; snapshots record the
  model + prompt version that produced them.
- format="json" constrains decoding, but responses are still schema-validated
  by the caller — the model can emit valid-but-wrong JSON.
"""

from __future__ import annotations

import json
import re
import urllib.request

OLLAMA_URL = "http://localhost:11434/api/chat"
DEFAULT_MODEL = "qwen3:4b"
DEFAULT_NUM_CTX = 4096
DEFAULT_NUM_PREDICT = 1024


class OllamaError(Exception):
    pass


def chat_json(
    system_prompt: str,
    user_message: str,
    model: str = DEFAULT_MODEL,
    num_ctx: int = DEFAULT_NUM_CTX,
    num_predict: int = DEFAULT_NUM_PREDICT,
    seed: int = 42,
    temperature: float = 0.0,
    timeout: int = 180,
    think: bool | None = False,
) -> tuple[dict | None, dict]:
    """One structuring call. Returns (parsed_json_or_None, metrics)."""
    body = {
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
    if think is not None:
        # Only meaningful for hybrid-reasoning models (qwen3); harmless there,
        # a 400 elsewhere — callers using other models pass think=None.
        body["think"] = think
    req = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = json.loads(resp.read().decode())
    except Exception as exc:
        raise OllamaError(f"ollama call failed ({model}): {exc}") from exc

    content = payload.get("message", {}).get("content", "")
    metrics = {
        k: payload.get(k, 0)
        for k in (
            "eval_count",
            "eval_duration",
            "prompt_eval_count",
            "prompt_eval_duration",
            "total_duration",
        )
    }
    return _extract_json(content), metrics


def _extract_json(text: str) -> dict | None:
    """Best-effort parse of a model response into a dict."""
    if not text:
        return None
    text = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return None
    return None
