import uuid
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.core.settings import Settings
from backend.inference.factory import build_inference_backend
from backend.services.chat import ChatService
from backend.api.routes.chat import router as chat_router


def create_app(settings: Optional[Settings] = None) -> FastAPI:
    if settings is None:
        settings = Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        backend = build_inference_backend(settings)
        app.state.chat_service = ChatService(backend=backend, settings=settings)
        yield
        if hasattr(backend, "aclose"):
            await backend.aclose()

    app = FastAPI(
        title="Singularity Chat API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def attach_request_id(request: Request, call_next):
        request.state.request_id = str(uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        return response

    app.include_router(chat_router, prefix="/api/v1")

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app
