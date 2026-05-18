from prometheus_client import Counter, Histogram

PROVIDER_REQUEST_DURATION = Histogram(
    "singularity_provider_request_duration_seconds",
    "Time spent on provider API calls",
    ["provider"],
    buckets=[0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0],
)

PROVIDER_RETRY_TOTAL = Counter(
    "singularity_provider_retry_total",
    "Number of provider request retries",
    ["provider"],
)

CHAT_REQUEST_TOTAL = Counter(
    "singularity_chat_request_total",
    "Chat requests by outcome",
    ["status", "model", "character"],  # status: success | upstream_429 | upstream_error | error
)

AUTH_FAILURE_TOTAL = Counter(
    "singularity_auth_failure_total",
    "Authentication failures",
    ["reason"],  # missing_key | invalid_key
)

TOKENS_PROMPT_TOTAL = Counter(
    "singularity_tokens_prompt_total",
    "Estimated prompt tokens consumed",
    ["provider", "model", "character"],
)

TOKENS_COMPLETION_TOTAL = Counter(
    "singularity_tokens_completion_total",
    "Estimated completion tokens consumed",
    ["provider", "model", "character"],
)

ESTIMATED_COST_USD_TOTAL = Counter(
    "singularity_estimated_cost_usd_total",
    "Estimated inference cost in USD (order-of-magnitude proxy at $0.001/1K tokens)",
    ["provider", "model", "character"],
)
