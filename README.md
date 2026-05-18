# Singularity

<p align="left">
  <img alt="Python" src="https://img.shields.io/badge/backend-FastAPI-009688?logo=fastapi&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/frontend-React-61dafb?logo=react&logoColor=black">
  <img alt="Tests" src="https://img.shields.io/badge/tests-pytest%20%2B%20vitest-brightgreen">
  <a href="https://github.com/singularitatem/singularity/blob/master/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/singularitatem/singularity.svg?color=blue">
  </a>
</p>

A local AI chat studio. Talk to richly-configured AI characters over a clean HTTP API — running on your machine or deployed behind a reverse proxy.

## Features

- **One-shot chat** — responses are returned in a single HTTP response; no WebSocket complexity
- **Character system** — built-in characters (Einstein, Bob, Luna) plus custom characters with name, emoji, description, and system prompt
- **Markdown rendering** — assistant responses render full GFM markdown: headers, lists, code blocks, tables, blockquotes
- **Voice** — read any message aloud with one click; pitch and rate are tuned per character via the Web Speech API
- **Conversation library** — multiple parallel conversations, persisted in `localStorage`, with per-conversation character binding
- **Pluggable inference** — swap the AI provider by implementing a single abstract interface (`InferenceBackend`)

## Quick start

```bash
make install   # one-time: pip install + npm install
make dev       # backend :8000 + frontend :5173 in parallel
```

Open [http://localhost:5173](http://localhost:5173). Set `PROVIDER=echo` (see below) to run fully offline without an API key.

## Configuration

Copy `.env.example` to `.env`:

| Variable | Default | Description |
|---|---|---|
| `PROVIDER` | `chai` | Inference backend: `chai` or `echo` |
| `CHAI_API_KEY` | — | API key for the Chai inference service |
| `CHAI_USER_NAME` | `User` | Display name sent to Chai as the human turn |
| `API_KEYS` | _(empty)_ | Comma-separated keys for `X-API-Key` auth. Empty = open/dev mode |
| `CHAT_RATE_LIMIT` | `30/minute` | Per-IP rate limit for `POST /api/v1/chat` |
| `DEFAULT_RATE_LIMIT` | `60/minute` | Per-IP rate limit for all other routes |
| `TRUSTED_PROXIES` | _(empty)_ | Comma-separated proxy IPs whose forwarded headers are trusted |
| `VITE_API_KEY` | _(empty)_ | Frontend API key sent as `X-API-Key` (set when `API_KEYS` is configured) |

## Production readiness

### Authentication

Set `API_KEYS` to a comma-separated list of secrets. Every request to `/api/v1/*` must then carry `X-API-Key: <key>`. The frontend reads `VITE_API_KEY` at build time and injects it automatically. Without any configured keys the app runs in open mode (suitable for local dev or trusted internal networks).

```bash
API_KEYS=secret1,secret2   # backend .env
VITE_API_KEY=secret1       # frontend .env
```

Auth failures are tracked as Prometheus metrics labelled by failure reason (`missing_key` / `invalid_key`).

### Rate limiting

Per-IP rate limits are enforced by [slowapi](https://github.com/laurentS/slowapi) before requests reach the inference backend. Both limits are configurable at runtime via environment variables — no code change or redeploy needed.

```bash
CHAT_RATE_LIMIT=100/minute    # loosen for high-traffic deployments
CHAT_RATE_LIMIT=5/minute      # tighten for cost control
```

IP spoofing via `X-Forwarded-For` is blocked by default. To trust a load balancer or reverse proxy, add its IP to `TRUSTED_PROXIES` — only then are forwarded headers accepted for rate-limit keying.

### Observability

#### Structured logging

The backend uses [structlog](https://www.structlog.org/) throughout. In development (`ENV=development`) logs are pretty-printed to the console. In production (`ENV=production`) every line is a JSON object, ready for ingestion by Datadog, Loki, or any log aggregator.

Every HTTP request emits a log line with a generated `request_id` that is also returned as the `X-Request-ID` response header — correlate frontend errors to backend traces without extra instrumentation:

```json
{"timestamp": "2026-05-17T18:32:20Z", "level": "info", "event": "http.request",
 "method": "POST", "path": "/api/v1/chat", "status": 200,
 "duration_ms": 812, "request_id": "0d5fe404-1e46-417c-87a7-9a0bc07459ad"}
```

Key log events emitted across the app:

| Event | Where | Notable fields |
|---|---|---|
| `app.started` / `app.stopped` | lifespan | `provider`, `env` |
| `http.request` | request middleware | `method`, `path`, `status`, `duration_ms`, `request_id` |
| `chat.request` | chat route | `bot_name`, `messages` (count) |
| `chat.upstream_rate_limited` | chat route | — |
| `chat.upstream_error` | chat route | `status` (upstream HTTP code) |
| `chat.unexpected_error` | chat route | full stack trace via `exc_info` |
| `auth.missing_key` / `auth.invalid_key` | deps | `path` |
| `voice.inference_failed` | voice route | `error` |

#### Prometheus metrics

All application metrics live in `backend/telemetry/metrics.py` and are exposed at `GET /metrics` via [prometheus-fastapi-instrumentator](https://github.com/trallnag/prometheus-fastapi-instrumentator) (which also adds per-route HTTP duration histograms automatically).

Custom metrics:

| Metric | Type | Labels | Description |
|---|---|---|---|
| `singularity_chat_request_total` | Counter | `status` | Chat outcomes: `success` · `upstream_429` · `upstream_error` · `error` |
| `singularity_provider_request_duration_seconds` | Histogram | `provider` | Inference round-trip latency; buckets at 0.25 s → 30 s |
| `singularity_provider_retry_total` | Counter | `provider` | Upstream retries (tenacity) |
| `singularity_auth_failure_total` | Counter | `reason` | Auth failures: `missing_key` · `invalid_key` |

`singularity_chat_request_total{status="upstream_429"}` rising while `upstream_error` stays flat means the upstream provider is being over-driven — a signal to tighten `CHAT_RATE_LIMIT` or add client-side backoff.

### Token counting

Token usage in API responses is calculated with [tiktoken](https://github.com/openai/tiktoken) (`cl100k_base` encoding) rather than a character-count heuristic, giving accurate prompt/completion token counts even when the upstream provider doesn't expose them.

## Testing

```bash
make test               # unit tests: pytest + vitest
make test-integration   # concurrency + rate-limit integration tests
```

Tests are co-located next to the code they cover (`*_test.py` on the backend, `*.test.ts` on the frontend). No separate `tests/` directory — the test file lives beside the module it exercises.

### Integration tests

`backend/app_test.py` uses `httpx.ASGITransport` to drive the full ASGI stack in-process (routing → middleware → rate limiter → service layer) with real `asyncio` concurrency, no mocking. What it verifies:

| Test | What it checks |
|---|---|
| `test_concurrent_requests_all_succeed` | 10 simultaneous requests all return 200 |
| `test_concurrent_responses_are_independent` | Each response echoes its own message, not another request's |
| `test_concurrent_requests_return_usage` | Token usage fields are present and internally consistent |
| `test_rate_limit_allows_requests_within_quota` | Requests within the configured limit succeed |
| `test_rate_limit_blocks_excess_requests` | The request that exceeds the quota gets 429 |
| `test_rate_limit_does_not_affect_other_routes` | Exhausting `/chat` quota leaves `/characters` and `/health` unaffected |
| `test_rate_limit_key_is_not_spoofable` | Three requests with different `X-Forwarded-For` headers share one bucket when `trusted_proxies` is empty |

The rate-limit storage is reset between each test via an `autouse` fixture so tests don't bleed quota into each other.

### Frontend tests

`frontend/src/test/` covers the model layer with [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/react):

- `useChatModel.test.ts` — conversation creation/switching, character switching, successful send, error handling, 429 error message copy
- `api.test.ts` — `fetchCharacters`, `sendChat` request shape, `ApiError` thrown on non-2xx, `bot_name` / `system_prompt` forwarded correctly

## Load testing

Requires a running backend. Start it in one terminal, run the test in another:

```bash
# terminal 1
make load-test-server              # echo backend — free, <5 ms responses, safe for CI
make load-test-server PROVIDER=chai  # real Chai inference — costs API credits

# terminal 2 — headless: 100 virtual users, 30 seconds, prints a summary table
make load-test

# or open the interactive Locust UI at http://localhost:8089
make load-test-ui
```

`load-test-server` starts uvicorn with `CHAT_RATE_LIMIT=100/second` so the rate limiter doesn't dominate results. Pass `PROVIDER=chai` to measure real inference throughput.

### User classes

`backend/locustfile.py` defines two Locust user classes that run concurrently:

**`ChatUser`** — models a realistic user session:
- Fetches the character list on startup
- 80% of tasks: `POST /api/v1/chat` with a random message to a random character
- 20% of tasks: `GET /api/v1/characters` (background browsing)
- 10% of tasks: `GET /health/live`
- Think time: 0.5–2 s between requests

**`BurstUser`** — stress-tests rate limiting and concurrency:
- Only sends `POST /api/v1/chat` with a minimal payload
- Think time: 0.1–0.5 s (3–4× faster than `ChatUser`)
- Intentionally exceeds rate limits to confirm 429s are returned, not crashes

### Reading the results

```
Type          Name                  # reqs  # fails  Avg  p95   req/s
POST          /api/v1/chat             409      0    812  1400   13.8
POST          /api/v1/chat [burst]    2308    152    2ms    4ms   77.6
GET           /api/v1/characters       132      0     25    60    4.4
GET           /health/live              54      0      1     4    1.8
```

- **Echo backend**: chat p50 < 5 ms, ~100 req/s aggregate — measures our FastAPI + asyncio overhead
- **Chai backend**: chat p50 ~7 s — dominated by upstream inference latency; expect ~10–15 concurrent requests before queuing builds
- **429 failures on `[burst]`**: expected — the burst users are designed to exceed the per-IP limit; confirms the limiter is working, not a bug

## Architecture

```
backend/
  api/
    routes/chat.py       ← GET /characters, POST /chat, POST /characters/voice
    routes/health.py     ← GET /health/live, GET /health/ready
    deps.py              ← auth, IP resolution, service injection
    schemas/chat.py      ← Pydantic request/response DTOs
  inference/
    interface.py         ← abstract InferenceBackend
    chai_backend.py      ← Chai API (default); injects system prompt as first bot turn
    echo.py              ← no-op dev backend (reflects input, no key needed)
    factory.py           ← selects backend from Settings.provider
  services/
    chat.py              ← ChatService; tiktoken token counting
    voice.py             ← voice profile inference
  telemetry/
    metrics.py           ← all Prometheus counters and histograms
    logging.py           ← structlog configuration
  core/
    settings.py          ← pydantic-settings; reads .env
  catalog.py             ← built-in character definitions
  app.py                 ← app factory, middleware, lifespan
  main.py                ← entrypoint

frontend/src/
  api.ts                 ← fetch client; injects X-API-Key, maps errors to ApiError
  model/useChatModel.ts  ← chat state, conversation persistence, abort handling
  model/useCharacterStore.ts  ← character CRUD (builtins from API + custom in localStorage)
  model/useSpeech.ts     ← Web Speech API with per-character voice profiles
  view/                  ← pure view components (CSS modules, dark theme)
```

**Adding a new inference backend:** implement `InferenceBackend` in `backend/inference/`, register it in `factory.py`, set `PROVIDER=<key>` in `.env`.
