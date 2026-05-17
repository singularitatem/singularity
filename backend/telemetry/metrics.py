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
    ["status"],  # success | upstream_429 | upstream_error | error
)

AUTH_FAILURE_TOTAL = Counter(
    "singularity_auth_failure_total",
    "Authentication failures",
    ["reason"],  # missing_key | invalid_key
)
