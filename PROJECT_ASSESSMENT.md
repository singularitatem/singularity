# Project Assessment

## Review Findings

### Finding 1

**[P1] Frontend still cannot operate when API-key auth is enabled**

File: [frontend/src/api.ts](/Users/yjin/dev/repos/singularity/frontend/src/api.ts:15)

The backend protects `/api/v1/chat` and `/api/v1/characters` with `require_api_key`, but the shared frontend API client still never sends `X-API-Key`. Once `Settings.api_keys` is configured, character loading and chat requests both return `401` and the shipped UI has no way to authenticate or recover. That means the current auth feature is not actually usable end-to-end.

### Finding 2

**[P2] Configured chat rate limit is still not wired through**

File: [backend/api/routes/chat.py](/Users/yjin/dev/repos/singularity/backend/api/routes/chat.py:64)

`Settings.chat_rate_limit` exists, but the `/chat` route decorator still hard-codes `30/minute`. Operators can change the configured limit and believe production policy changed, while the effective route limit remains unchanged. This is exactly the kind of config drift that causes surprises in production incidents.

### Finding 3

**[P2] Per-IP throttling is spoofable because forwarded headers are trusted unconditionally**

File: [backend/api/deps.py](/Users/yjin/dev/repos/singularity/backend/api/deps.py:46)

`get_real_ip()` accepts `X-Forwarded-For` and `X-Real-IP` from any client request. Unless the app is guaranteed to sit behind a trusted proxy that strips and rewrites these headers, a caller can forge arbitrary IPs to evade rate limits and pollute auth logs. For hardened deployments, forwarded headers must only be honored from trusted proxy infrastructure.

### Finding 4

**[P2] Failed chat requests still leave an empty assistant placeholder in history**

File: [frontend/src/model/useChatModel.ts](/Users/yjin/dev/repos/singularity/frontend/src/model/useChatModel.ts:147)

`sendMessage()` appends a blank assistant message before the API request starts, but the error path only sets `streamError` and never removes or annotates that placeholder. Any `401`, `429`, `500`, or network failure therefore leaves a permanent empty assistant bubble in the saved conversation, which is confusing to users and pollutes persisted history.

## Summary

The project is improving, but these issues still block it from feeling production-ready end to end:

- auth is not fully integrated into the shipped frontend
- operational configuration is not fully wired through
- rate limiting is not hardened against spoofed client IPs
- frontend error handling still leaves corrupted-looking conversation state
