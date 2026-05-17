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

