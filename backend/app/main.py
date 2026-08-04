from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth as auth_api
from .api import catalog as catalog_api
from .api import plans as plans_api
from .api import transcript as transcript_api
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
    app.include_router(auth_api.router)
    app.include_router(catalog_api.router)
    app.include_router(plans_api.router)
    app.include_router(transcript_api.router)

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
