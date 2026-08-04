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


settings = Settings()
