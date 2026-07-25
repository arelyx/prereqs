from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://prereqs:prereqs@localhost:5432/prereqs"
    # 5273 is this project's dev port (5173 kept for stock vite runs)
    cors_origins: list[str] = ["http://localhost:5273", "http://localhost:5173"]
    token_ttl_days: int = 30


settings = Settings()
