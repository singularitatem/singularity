# A-Grade Production Proposal

## Goal

Move Singularity from its current `C` production-readiness level to an `A` by turning it into software that is:

- safe under real multi-user load
- operationally observable
- cost-aware
- secure enough for real deployment
- durable and recoverable
- testable across backend and frontend

An `A` grade does not mean “perfect.” It means the system can be responsibly deployed for real users with clear operational controls, strong reliability practices, and an architecture that will not collapse under normal production demands.

## What “A Grade” Means

For this project, an `A` grade should mean:

1. The backend has durable state and a real user model.
2. The service can be operated with metrics, logs, alerts, and dashboards.
3. Authentication, authorization, and quota enforcement are real, not placeholder-level.
4. Token and cost usage are measured accurately enough to drive billing and policy.
5. The app behaves predictably under concurrency, failure, and retries.
6. The frontend has automated tests for its most important flows.
7. Documentation matches the actual product and deployment model.

## Current Grade

Current readiness grade: `C`

Main reasons it is not yet `A`:

- no durable persistence
- no real identity/tenant system
- token accounting is heuristic
- observability is still partial
- no production-grade quota model
- frontend has no automated tests
- test layout is duplicated in the backend

## Proposal Overview

To reach `A`, the work should be split into six tracks:

1. Data and persistence
2. Auth, tenancy, and quotas
3. AI usage accounting and cost control
4. Reliability and operations
5. Test maturity and CI quality gates
6. Product/documentation alignment

## Track 1: Data and Persistence

### Why this matters

Right now conversations live in frontend `localStorage`, which is fine for a local single-user demo but not for production.

To reach `A`, the backend needs a real persistence layer.

### Required changes

- introduce a production database such as Postgres
- add a proper DB access layer
- use a connection pool
- add migrations
- persist:
  - users
  - API keys or auth principals
  - conversations
  - messages
  - usage records
  - rate-limit/quota state where appropriate

### Suggested schema areas

- `users`
- `api_keys` or `service_accounts`
- `conversations`
- `messages`
- `chat_requests`
- `usage_events`
- `rate_limit_events`

### Minimum acceptance criteria

- conversations survive browser refresh and machine changes
- backend can reconstruct full conversation history
- usage records are queryable by user, model, and time range
- DB pool settings are configurable by environment
- migrations are part of deploy workflow

## Track 2: Auth, Tenancy, and Quotas

### Why this matters

Static API-key allowlists are not enough for a production-grade system.

### Required changes

- replace simple list-based API key auth with a real auth model
- support:
  - key ownership
  - revocation
  - expiration
  - metadata
  - auditability
- define a user or tenant model
- enforce per-user or per-tenant access controls
- add quota policy based on:
  - request count
  - token volume
  - model tier

### Minimum acceptance criteria

- every request is attributable to a user or tenant
- auth failures are logged and metered
- quotas are enforced per principal, not per IP only
- keys can be rotated without redeploying the app

## Track 3: Accurate AI Usage Accounting

### Why this matters

Heuristic token counting is not good enough for an `A`.

### Required changes

- collect provider-backed token usage when available
- if the provider does not expose usage, compute it with a deterministic tokenizer for the relevant model family
- store:
  - prompt tokens
  - completion tokens
  - total tokens
  - provider/model name
  - latency
  - retry count
  - estimated cost
- expose usage at:
  - API response layer when appropriate
  - metrics layer
  - persistence layer

### Minimum acceptance criteria

- usage totals are no longer based on rough char-count heuristics
- cost can be estimated by user, model, and time range
- token-based quotas can be enforced with reasonable accuracy

## Track 4: Reliability and Operations

### Why this matters

An `A` grade requires operability, not just code structure.

### Required changes

- keep separate liveness and readiness endpoints
- add more provider-level metrics:
  - success count
  - failure count
  - upstream 429 count
  - timeout count
  - auth failure count
  - usage totals
- add structured business logs for:
  - chat request accepted
  - provider call completed
  - retry happened
  - quota denied
  - auth denied
- make all operational limits configurable:
  - HTTP timeouts
  - connection pool sizes
  - retry counts
  - rate limits
  - model policy

### Production SRE expectations

- dashboard for backend health
- dashboard for provider latency and failures
- alerting for provider outage, elevated 429s, and error spikes
- deploy-safe startup checks

### Minimum acceptance criteria

- on-call can answer “what is broken?” from dashboards/logs
- provider outages are visible without reading raw logs
- deploys do not require code edits to tune capacity or retry policy

## Track 5: Test Maturity and CI Quality Gates

### Why this matters

An `A` grade requires trust in changes.

### Required changes

- remove the duplicated backend test layout
- keep one test strategy only
- add frontend automated tests for:
  - conversation creation
  - conversation switching
  - character switching
  - character editing
  - request error states
  - voice profile UI behavior
- add integration tests that cover:
  - auth-enabled mode
  - quota failures
  - readiness degradation
  - provider retry behavior
- add CI checks for:
  - backend tests
  - frontend tests
  - frontend build
  - lint/type checks

### Optional but high-value

- load tests for chat throughput
- contract tests for provider integrations
- smoke tests against staging config

### Minimum acceptance criteria

- backend and frontend both have meaningful automated coverage
- duplicated tests are removed
- CI blocks regressions before merge

## Track 6: Product and Documentation Alignment

### Why this matters

An `A` grade includes operational clarity.

### Required changes

- keep README, internal docs, and code aligned on:
  - non-streaming vs streaming design
  - auth requirements
  - deployment shape
  - environment variables
- document:
  - local dev
  - staging/prod setup
  - DB migration workflow
  - key rotation
  - metrics/alerts

### Minimum acceptance criteria

- a new engineer can set up the repo without guessing
- an operator can deploy and troubleshoot using docs only

## Recommended Architecture Upgrades

### Backend

To get to `A`, the backend should evolve toward:

```text
backend/
  api/
  auth/
  core/
  db/
  domain/
  repositories/
  services/
  inference/
  telemetry/
```

Key additions:

- `db/` for engine/session/pool setup
- `repositories/` for persistence logic
- `auth/` for principals, API keys, and authorization policy
- `telemetry/` for metrics/logging helpers

### Frontend

The frontend should gain:

- a small API client layer
- test utilities
- component/integration tests
- explicit request/response state naming instead of old “streaming” semantics if one-shot HTTP remains the design

## Phased Plan

## Phase 1: B- to B

- remove duplicated backend tests
- add frontend test harness
- align naming/docs around non-streaming chat
- improve metrics for provider failures and auth failures

Outcome:

- cleaner engineering baseline

## Phase 2: B to B+

- add persistence layer and migrations
- persist conversations and messages
- add proper connection pooling

Outcome:

- durable product state

## Phase 3: B+ to A-

- add real principal model
- replace static auth allowlist with stored keys/users
- add quota enforcement
- add accurate token accounting

Outcome:

- real multi-user control plane

## Phase 4: A-

- production dashboards and alerts
- load testing
- rollout/runbook docs
- tighten CI quality gates

Outcome:

- genuinely production-operable service

## Top 10 Changes Required For An A

1. Add Postgres-backed persistence with migrations.
2. Add DB connection pooling and repository layer.
3. Add real auth principal and API key ownership model.
4. Add token-accurate usage accounting.
5. Add per-user or per-tenant quota enforcement.
6. Expand metrics to include AI-specific business and failure signals.
7. Remove duplicated backend tests.
8. Add frontend automated tests.
9. Add production dashboards and alerts.
10. Keep docs strictly aligned with the actual product design.

## Explicit Non-Goals For Now

These are not required for an `A` by themselves:

- perfect microservice decomposition
- multi-region deployment
- GPU scheduling
- advanced workflow orchestration

Those may matter later, but they are not the current gap between `C` and `A`.

## Final Recommendation

The fastest path to `A` is not cosmetic refactoring. It is adding the missing production substrate:

- persistence
- identity
- quotas
- accurate usage accounting
- observability
- frontend test coverage

The backend structure is good enough to support that evolution. The project does not need a ground-up rewrite. It needs disciplined expansion into a real service platform.
