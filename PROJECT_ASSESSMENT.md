# Project Assessment

Updated for the current codebase on May 17, 2026.

## Overall Grade

`B-` for production readiness.

The three most actionable gaps from the prior assessment have been closed: AI-ops observability is now complete with token/cost/model/character metrics, conversation state is now durable on the backend via SQLite, and the frontend syncs with the backend with localStorage fallback. The codebase now qualifies as a production-viable internal app.

## What Improved (this pass)

- **Backend persistence**: Conversations are now stored in SQLite via SQLAlchemy. New REST endpoints (`GET/POST/DELETE/PATCH /api/v1/conversations`) let clients manage conversation history server-side: [backend/services/conversation.py](/Users/yjin/dev/repos/singularity/backend/services/conversation.py:1), [backend/api/routes/conversations.py](/Users/yjin/dev/repos/singularity/backend/api/routes/conversations.py:1)
- **Chat persistence**: When the frontend passes `conversation_id` in a chat request, the backend appends the user+assistant exchange to the conversation in SQLite: [backend/api/routes/chat.py](/Users/yjin/dev/repos/singularity/backend/api/routes/chat.py:91)
- **Frontend sync**: On startup the frontend loads conversations from the backend and uses it as source of truth; falls back to localStorage gracefully if the backend is unreachable: [frontend/src/model/useConversationStore.ts](/Users/yjin/dev/repos/singularity/frontend/src/model/useConversationStore.ts:1)
- **Token/cost metrics**: `singularity_tokens_prompt_total`, `singularity_tokens_completion_total`, and `singularity_estimated_cost_usd_total` are now exported as Prometheus counters with `[provider, model, character]` labels: [backend/telemetry/metrics.py](/Users/yjin/dev/repos/singularity/backend/telemetry/metrics.py:1)
- **Model + character tracking**: `CHAT_REQUEST_TOTAL` now carries `model` and `character` labels, enabling per-model and per-character traffic breakdowns: [backend/telemetry/metrics.py](/Users/yjin/dev/repos/singularity/backend/telemetry/metrics.py:20)
- **Model propagation**: `ChatResult.model` is now populated so the actual model name flows through to metrics and the response DTO: [backend/services/chat.py](/Users/yjin/dev/repos/singularity/backend/services/chat.py:22)

## What Was Already Strong

- Backend structure: app factory, route layer, service layer, provider abstraction, telemetry, settings.
- Test discipline: co-located backend tests, frontend model/API tests, integration and load-test paths.
- Production basics: request IDs, structured logs, configurable rate limits, provider retry/latency instrumentation.
- Frontend product surface: multi-conversation flow, character system, markdown rendering, speech.

## Remaining Gaps

### 1. Auth is still shared-secret gating

API-key auth now works end-to-end, but there are no users, sessions, roles, quotas, or tenant boundaries. Acceptable for internal or single-operator use.

### 2. Rate limiting is process-local

`slowapi` uses an in-process counter. Under horizontal scale each process gets its own bucket. Moving to a Redis-backed limiter would require adding a Redis dependency.

### 3. AI usage accounting is estimated, not provider-reported

Token counts are approximated with `tiktoken` (cl100k_base). This is enough for trend monitoring but not for precise billing.

### 4. Single-node oriented

- Frontend API key injected at build time (`VITE_API_KEY`)
- No distributed limiter
- No job queue
- No secret-manager integration

### 5. Database schema has no migration story

Tables are created with `create_all` on startup. Schema changes require manual intervention or a migration tool (Alembic).

## Verification

- `python3 -m pytest -q` → `63 passed`
- `cd frontend && npm run test -- --run` → `19 passed`
- `cd frontend && npm run build` → success

## Bottom Line

The repo has crossed from "well-structured local app" to "production-viable internal service." The persistence, sync, and observability gaps from the prior assessment are closed. The remaining frontier — distributed rate limiting, real user identity, and schema migrations — is the right next set of problems for a team heading toward external production traffic.
