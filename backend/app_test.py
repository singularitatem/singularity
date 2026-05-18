"""
Integration tests for concurrency behaviour and rate limiting.

These tests exercise the full ASGI stack — routing, middleware, rate limiter,
service layer — using real async I/O rather than the synchronous TestClient.
"""
import asyncio

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.core.settings import Settings
from backend.db.session import build_engine, build_session_factory, init_db
from backend.inference.echo import EchoBackend
from backend.services.chat import ChatService
from backend.services.conversation import ConversationService

_CHAT_PAYLOAD = lambda i: {  # noqa: E731
    "messages": [{"role": "user", "content": f"ping {i}"}],
    "model": "default",
}


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """
    The chat route uses a module-level Limiter whose in-memory storage persists
    across tests. Reset it before each test so rate-limit counts start clean.
    """
    import backend.api.routes.chat as chat_module
    chat_module.limiter._storage.reset()
    yield

@pytest.fixture
async def async_app(settings):
    """
    FastAPI app wired for async httpx tests.
    ASGITransport does not run the ASGI lifespan, so we pre-populate app.state
    with the same objects the lifespan would create.
    """
    app = create_app(settings)
    echo = EchoBackend()
    app.state.chat_service = ChatService(backend=echo, settings=settings)
    app.state.settings = settings

    engine = build_engine(settings.db_url)
    await init_db(engine)
    session_factory = build_session_factory(engine)
    app.state.conversation_service = ConversationService(session_factory)
    yield app
    await engine.dispose()


@pytest.fixture
def low_rate_settings():
    return Settings(provider="echo", default_model="test-model", chat_rate_limit="2/minute")


@pytest.fixture
def rate_limited_client(low_rate_settings):
    """TestClient backed by an app that allows only 2 chat requests/minute."""
    with TestClient(create_app(low_rate_settings)) as c:
        yield c


# ── Concurrency ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_concurrent_requests_all_succeed(async_app):
    """Ten concurrent requests must all return 200 with no cross-contamination."""
    transport = httpx.ASGITransport(app=async_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        responses = await asyncio.gather(*[
            client.post("/api/v1/chat", json=_CHAT_PAYLOAD(i))
            for i in range(10)
        ])

    statuses = [r.status_code for r in responses]
    assert all(s == 200 for s in statuses), f"unexpected statuses: {statuses}"


@pytest.mark.asyncio
async def test_concurrent_responses_are_independent(async_app):
    """Each response must echo its own message, not another request's content."""
    transport = httpx.ASGITransport(app=async_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        responses = await asyncio.gather(*[
            client.post("/api/v1/chat", json=_CHAT_PAYLOAD(i))
            for i in range(10)
        ])

    # asyncio.gather preserves order, so responses[i] is the reply to ping i.
    for i, r in enumerate(responses):
        assert f"ping {i}" in r.json()["content"], (
            f"response {i} contained wrong content: {r.json()['content']!r}"
        )


@pytest.mark.asyncio
async def test_concurrent_requests_return_usage(async_app):
    """Usage fields must be present and non-negative on every concurrent response."""
    transport = httpx.ASGITransport(app=async_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        responses = await asyncio.gather(*[
            client.post("/api/v1/chat", json=_CHAT_PAYLOAD(i))
            for i in range(5)
        ])

    for r in responses:
        usage = r.json()["usage"]
        assert usage["prompt_tokens"] >= 0
        assert usage["completion_tokens"] >= 0
        assert usage["total_tokens"] == usage["prompt_tokens"] + usage["completion_tokens"]


# ── Rate limiting ─────────────────────────────────────────────────────────────

def test_rate_limit_allows_requests_within_quota(rate_limited_client):
    """Requests within the 2/minute quota must succeed."""
    for _ in range(2):
        r = rate_limited_client.post("/api/v1/chat", json=_CHAT_PAYLOAD(0))
        assert r.status_code == 200


def test_rate_limit_blocks_excess_requests(rate_limited_client):
    """The third request within a minute must be rejected with 429."""
    rate_limited_client.post("/api/v1/chat", json=_CHAT_PAYLOAD(0))
    rate_limited_client.post("/api/v1/chat", json=_CHAT_PAYLOAD(0))
    r = rate_limited_client.post("/api/v1/chat", json=_CHAT_PAYLOAD(0))
    assert r.status_code == 429


def test_rate_limit_does_not_affect_other_routes(rate_limited_client):
    """Exhausting the chat rate limit must not block character or health endpoints."""
    for _ in range(3):
        rate_limited_client.post("/api/v1/chat", json=_CHAT_PAYLOAD(0))

    assert rate_limited_client.get("/api/v1/characters").status_code == 200
    assert rate_limited_client.get("/health/live").status_code == 200


def test_rate_limit_key_is_not_spoofable(low_rate_settings):
    """
    X-Forwarded-For must be ignored when trusted_proxies is empty.
    Requests with different spoofed IPs must share the same rate-limit bucket
    because the actual connecting IP (testclient) is used as the key.
    """
    with TestClient(create_app(low_rate_settings)) as client:
        r1 = client.post("/api/v1/chat", json=_CHAT_PAYLOAD(0),
                         headers={"X-Forwarded-For": "1.2.3.4"})
        r2 = client.post("/api/v1/chat", json=_CHAT_PAYLOAD(0),
                         headers={"X-Forwarded-For": "5.6.7.8"})
        r3 = client.post("/api/v1/chat", json=_CHAT_PAYLOAD(0),
                         headers={"X-Forwarded-For": "9.10.11.12"})

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r3.status_code == 429
