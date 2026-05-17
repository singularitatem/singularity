import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.api.deps import get_real_ip
from backend.api.routes.chat import router as chat_router
from backend.api.routes.health import router as health_router
from backend.core.logging import configure_logging
from backend.core.settings import Settings
from backend.inference.factory import build_inference_backend
from backend.services.chat import ChatService

log = structlog.get_logger(__name__)


def create_app(settings: Optional[Settings] = None) -> FastAPI:
    if settings is None:
        settings = Settings()

    configure_logging(settings.env)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        backend = build_inference_backend(settings)
        app.state.chat_service = ChatService(backend=backend, settings=settings)
        app.state.backend = backend
        app.state.settings = settings
        log.info("app.started", provider=settings.provider, env=settings.env)
        yield
        await backend.aclose()
        log.info("app.stopped")

    limiter = Limiter(key_func=get_real_ip, default_limits=[settings.default_rate_limit])

    app = FastAPI(title="Singularity Chat API", version="0.1.0", lifespan=lifespan)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

    @app.middleware("http")
    async def request_middleware(request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        t0 = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - t0) * 1000)

        log.info(
            "http.request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=duration_ms,
        )
        response.headers["X-Request-ID"] = request_id
        return response

    app.include_router(health_router)
    app.include_router(chat_router, prefix="/api/v1")

    return app
