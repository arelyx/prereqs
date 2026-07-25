from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="prereqs API",
        description="Unified course, requirement, and planning data for academic planning.",
        version="0.1.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
