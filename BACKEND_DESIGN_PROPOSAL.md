# Backend Design Proposal

## Goal

Evolve the current FastAPI chat backend from a prototype into a modular, testable service that can support:

- multiple inference providers
- both HTTP and WebSocket transports
- environment-based configuration
- easier testing and local development
- future features such as auth, persistence, observability, and rate limiting

This proposal is intentionally scoped to backend architecture first. It does not try to redesign the frontend or the proto contract.

## Current State

Today the backend is small and easy to follow, which is good for initial velocity. The main limitations are architectural rather than functional:

- the API router constructs and owns the inference backend directly
- transport logic and chat orchestration live in the same module
- REST and WebSocket paths duplicate request parsing and message mapping
- application configuration is inlined at import time
- there is no service layer or dependency injection boundary
- there is no backend test harness yet

This is a healthy prototype shape, but it will get harder to extend cleanly once we add a real provider.

## Design Principles

1. Keep transport thin.
2. Push orchestration into services.
3. Treat provider integrations as plugins behind a stable interface.
4. Make configuration explicit and environment-driven.
5. Prefer typed request and response models at the application boundary.
6. Make the default architecture easy to test with fakes.
7. Support gradual migration instead of a large rewrite.

## Proposed Architecture

Suggested backend layout:

> **Implemented deviation:** `domain/` is deferred to Phase 2. `ChatRequest` and `ChatMessage`
> live in `inference/interface.py` until a real provider forces a divergence between transport
> and domain shapes. Adding the split before that point just creates mapping boilerplate with
> no concrete benefit. `core/logging.py` is also deferred — structured logging belongs after
> the first real provider is wired in and request patterns are understood.

```text
backend/
  api/
    routes/
      chat.py
    schemas/
      chat.py
    deps.py
  core/
    settings.py
    logging.py       ← deferred to Phase 3
  domain/            ← deferred to Phase 2
    chat.py
    errors.py
  services/
    chat.py
  inference/
    interface.py
    echo.py
    openai_backend.py
    anthropic_backend.py
    factory.py
  app.py
  main.py
  tests/
    api/
    services/
    inference/
```

### Layer Responsibilities

#### `api/`

Owns HTTP and WebSocket concerns only:

- request and response schemas
- route registration
- dependency wiring
- transport-specific error handling
- status codes and websocket messages

This layer should not know how provider selection works internally.

#### `services/`

Owns chat orchestration:

- validate application-level chat behavior
- normalize requests from different transports
- call the selected inference backend
- enforce policies such as model allowlists, token limits, and defaults
- optionally coordinate persistence, tracing, and rate limiting later

This is the main seam for unit testing.

#### `domain/`

Owns backend-internal models and errors:

- `ChatMessage`
- `ChatRequest`
- `ChatResponse`
- `StreamEvent`
- structured error types

These models should be transport-agnostic and provider-agnostic.

#### `inference/`

Owns provider integrations:

- shared backend interface
- concrete providers such as echo, OpenAI, Anthropic, or local models
- backend factory and registration logic

This lets us add or swap providers without touching route handlers.

#### `core/`

Owns shared application concerns:

- settings
- logging
- environment parsing
- startup wiring

## Main Design Changes

### 1. Introduce an App Factory

Current state:

- the FastAPI app is created at import time
- configuration is inlined in `backend/main.py`

Proposal:

- create `backend/app.py` with `create_app(settings: Settings) -> FastAPI`
- keep `backend/main.py` as a thin entrypoint

Benefits:

- easier environment-based startup
- cleaner test setup
- easier lifespan hooks later
- less hidden global state

Example shape:

```python
from fastapi import FastAPI


def create_app(settings: Settings) -> FastAPI:
    app = FastAPI(title="Singularity Chat API", version="0.1.0")
    app.include_router(chat_router, prefix="/api/v1")
    return app
```

### 2. Add Explicit Settings

Current state:

- allowed CORS origins are hard-coded
- provider choice is hard-coded

Proposal:

- add `backend/core/settings.py`
- use a typed settings object for:
  - environment
  - cors origins
  - provider name
  - default model
  - provider credentials
  - request limits and timeouts

Benefits:

- cleaner deploy story
- easier local overrides
- easier tests
- no need to edit source code to swap providers

### 3. Add a `ChatService`

Current state:

- route handlers perform request transformation and call the backend directly

Proposal:

- create `backend/services/chat.py`
- move orchestration into a service object

Possible responsibilities:

- convert API schemas into domain requests
- pick or validate a model
- call `backend.chat()` or `backend.stream_chat()`
- convert provider failures into domain errors

Benefits:

- simpler routes
- shared logic across REST and WebSocket
- easier unit testing without ASGI setup

### 4. Use Transport Schemas and Domain Models Separately

Current state:

- Pydantic DTOs and internal models are mixed close together

Proposal:

- keep API schemas in `backend/api/schemas/chat.py`
- keep internal domain models in `backend/domain/chat.py`

Benefits:

- cleaner separation of concerns
- easier evolution of internal logic
- cleaner support for multiple external interfaces later

Suggested split:

- API schema: `ChatRequestDTO`, `ChatResponseDTO`
- Domain model: `ChatRequest`, `AssistantMessage`, `StreamChunk`

### 5. Replace Global Backend Construction With a Factory

Current state:

- `_backend = EchoBackend()` lives inside the chat router module

Proposal:

- add `backend/inference/factory.py`
- instantiate the provider based on settings
- inject it through dependency wiring or app state

Benefits:

- provider choice becomes configuration instead of code edits
- routes no longer own provider lifecycle
- testing with fake backends becomes easy

Minimal pattern:

```python
def build_inference_backend(settings: Settings) -> InferenceBackend:
    if settings.provider == "echo":
        return EchoBackend()
    if settings.provider == "openai":
        return OpenAIBackend(settings)
    raise ValueError(f"Unsupported provider: {settings.provider}")
```

### 6. Normalize REST and WebSocket Through One Service Path

Current state:

- REST and WebSocket handlers both map messages independently
- this will drift as features grow

Proposal:

- both transports should call the same service methods
- only transport framing should differ

Example:

- REST route calls `chat_service.chat(request)`
- WebSocket route calls `chat_service.stream_chat(request)`

Benefits:

- one place to enforce behavior
- one place to add validation and instrumentation
- fewer subtle inconsistencies

### 7. Establish Structured Error Boundaries

> **Implemented deviation:** Error taxonomy is deferred to Phase 3. Inventing `ProviderTimeoutError`
> and `ProviderAuthenticationError` before a real provider exists tends to produce the wrong names.
> The seam (service layer catching and re-raising) is in place; the named types come later.

Current state:

- provider and validation failures are not clearly translated

Proposal:

- define domain errors such as:
  - `InvalidChatRequestError`
  - `UnsupportedModelError`
  - `ProviderTimeoutError`
  - `ProviderAuthenticationError`
  - `ProviderUnavailableError`

- map them in the API layer to:
  - HTTP responses for REST
  - stable websocket error messages and close semantics for streaming

Benefits:

- predictable client behavior
- cleaner logs
- easier incident diagnosis

### 8. Plan for Observability Early

> **Implemented:** Request IDs are added in Phase 1 as `X-Request-ID` response headers via HTTP
> middleware — one line, immediately useful for correlating logs across WebSocket sessions.
> Latency measurement and provider attribution are deferred to Phase 3.

Even before adding a real provider, reserve seams for:

- request ids
- structured logging
- latency measurement
- provider name and model attribution
- streaming completion and failure events

This does not need to be heavy on day one, but the service boundary is the right place for it.

## Suggested Interfaces

### Domain Request

Instead of growing method signatures forever, use a request object:

```python
@dataclass
class ChatRequest:
    messages: list[ChatMessage]
    model: str
    temperature: float | None = None
    max_tokens: int | None = None
    conversation_id: str | None = None
```

### Backend Interface

The current interface is a good start. It just needs to scale with richer request objects:

```python
class InferenceBackend(ABC):
    @abstractmethod
    async def chat(self, request: ChatRequest) -> str:
        ...

    @abstractmethod
    async def stream_chat(self, request: ChatRequest) -> AsyncIterator[str]:
        ...
```

This keeps future expansion controlled and avoids repeated breaking changes.

## Testing Strategy

> **Implemented addition:** `pytest-asyncio` (asyncio_mode=auto in `pyproject.toml`) and `httpx`
> are required for async service tests and FastAPI's `TestClient`. Both are added to
> `requirements.in`. All 4 initial test targets from below are implemented and passing (12 tests).

Backend code quality will improve much faster if we install a small test harness now.

### Test Layers

#### API tests

Use FastAPI test clients to verify:

- `POST /api/v1/chat` success and validation failures
- websocket stream framing
- error mapping

#### Service tests

Use fake backends to verify:

- request normalization
- model validation
- error translation
- streaming behavior

#### Provider contract tests

Use shared tests for every backend implementation:

- returns assistant output
- handles empty message history correctly
- streams in valid chunk order

### Initial Test Targets

First useful tests:

1. `chat_service.chat()` returns the backend response for a valid request.
2. `chat_service.stream_chat()` yields chunks in order.
3. `POST /api/v1/chat` converts DTOs into domain messages correctly.
4. WebSocket streaming sends `{delta, done}` events consistently.

## Migration Plan

This can be done incrementally.

### Phase 1

- add settings module
- add app factory
- add chat service
- move schemas out of route module
- keep `EchoBackend`

Result:

- same product behavior
- cleaner seams

### Phase 2

- add backend factory
- inject provider via settings
- add first backend tests

Result:

- provider swap becomes configuration-based

### Phase 3

- add real provider integration
- add structured errors
- add logging and request ids

Result:

- production-ready provider integration path

### Phase 4

- add auth, persistence, rate limiting, and observability as needed

Result:

- features grow without turning route handlers into the system center

## Recommended Immediate Next Steps

1. Create `backend/app.py` and move app creation into `create_app()`.
2. Add `backend/core/settings.py` with provider and CORS configuration.
3. Add `backend/services/chat.py` and move orchestration there.
4. Move API request and response models into `backend/api/schemas/chat.py`.
5. Add pytest and the first service and API tests.
6. Only after these seams exist, add a real provider backend.

## Open Questions

- Will provider selection be global per deployment, or request-scoped?
- Do we expect conversation persistence soon, or can requests stay stateless for now?
- Is proto meant to remain the source of truth for both HTTP and WebSocket contracts?
- Should streaming semantics stay as raw `{delta, done}` events, or evolve into typed event objects?
- Do we want one backend instance per app, or lightweight per-request construction?

## Summary

The current backend is a good prototype, but it is still route-centered. The main improvement is to move from a router-owned provider to an app-wired service-oriented design. That gives us cleaner modularity, safer scaling, better tests, and a much smoother path to adding real inference backends.
