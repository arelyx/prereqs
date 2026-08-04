from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://prereqs:prereqs@localhost:5432/prereqs"
    # 5273 is this project's dev port (5173 kept for stock vite runs)
    cors_origins: list[str] = ["http://localhost:5273", "http://localhost:5173"]
    token_ttl_days: int = 30

    # Transcript import (LLM-gated). When Ollama is unreachable or the model
    # is missing, the feature refuses cleanly (503) — there is no heuristic
    # fallback. Prod leaves these unset and therefore unreachable, which is
    # the intended off state.
    ollama_url: str = "http://localhost:11434"
    transcript_llm_model: str = "qwen3:4b"
    transcript_llm_timeout: float = 120.0  # per LLM call, seconds
    transcript_budget_seconds: float = 600.0  # whole-request ceiling
    transcript_max_bytes: int = 10 * 1024 * 1024
    # In-flight parse cap. They serialize on the LLM lock regardless, so a
    # deeper queue only pins threadpool threads and blows each waiter's budget.
    transcript_max_concurrent: int = 4

    # PDF text extraction bounds. pypdf is pure Python, so extraction holds
    # the GIL of the single uvicorn worker, and its cost is superlinear in
    # text volume — a 39 KB upload whose content stream Flate-expands to 11 MB
    # burned 262 s of CPU and returned a normal-looking 200; a 160 KB one ran
    # 82+ minutes and degraded every other endpoint from 2 ms to ~1 s. The
    # upload cap bounds none of it: compression ratio is the attacker's free
    # variable, so the *decompressed* work has to be bounded directly.
    #
    # Reference point — the real 794 KB MyUCSC export (18 quarters): 7 pages,
    # 439 KB of content streams, 11,853 chars, 0.19 s. Every default below
    # leaves it 5-12x of headroom.
    transcript_max_pages: int = 40
    transcript_max_text_chars: int = 150_000
    # Decompressed content-stream bytes for the WHOLE document, not per page:
    # a per-page cap multiplies by the page cap, which left 40 x 4 MB ~ 128 s
    # of GIL reachable. This is the bound that stops bombs whose operators
    # show no text (the char cap's mid-page abort never fires on those).
    # Measured cost of walking operators is ~0.8-2 s per MB of stream, so this
    # caps one parse at roughly 2-4 s of CPU.
    transcript_max_stream_bytes: int = 2 * 1024 * 1024
    transcript_extract_seconds: float = 5.0


settings = Settings()
