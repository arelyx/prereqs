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
    #
    # The whole transcript goes to the model in ONE call: gemma4:12b follows a
    # detailed prompt well enough to read a full document, and it decides pass
    # vs fail itself. Output is the cost driver (~1.7k tokens for a 4-year
    # transcript at ~49 tok/s), so the schema carries only fields the UI uses.
    ollama_url: str = "http://localhost:11434"
    transcript_llm_model: str = "gemma4:12b"
    transcript_llm_timeout: float = 300.0
    # Sanity bound only. The upload is held in RAM (never spooled to disk), so
    # this also keeps a stray huge file from ballooning the worker.
    transcript_max_bytes: int = 25 * 1024 * 1024


settings = Settings()
