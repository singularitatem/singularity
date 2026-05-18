import time
from typing import Optional

import httpx
import structlog
from tenacity import RetryCallState, retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from backend.telemetry.metrics import PROVIDER_REQUEST_DURATION, PROVIDER_RETRY_TOTAL
from backend.inference.interface import ChatRequest, InferenceBackend, InferenceResult

log = structlog.get_logger(__name__)

_API_URL = "http://guanaco-submitter.guanaco-backend.k2.chaiverse.com/endpoints/onsite/chat"
_HEALTH_URL = "http://guanaco-submitter.guanaco-backend.k2.chaiverse.com/health"
_DEFAULT_BOT_NAME = "Einstein"
_DEFAULT_USER_NAME = "User"
_PROVIDER = "chai"

_RETRYABLE = retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError))


def _count_retry(retry_state: RetryCallState) -> None:
    PROVIDER_RETRY_TOTAL.labels(provider=_PROVIDER).inc()


def _extract_tokens(data: dict) -> tuple[Optional[int], Optional[int]]:
    """Try to extract provider-reported token counts from the response payload."""
    usage = data.get("usage") or data.get("token_counts") or {}
    prompt = (
        usage.get("prompt_tokens")
        or usage.get("input_tokens")
        or usage.get("prompt")
    )
    completion = (
        usage.get("completion_tokens")
        or usage.get("output_tokens")
        or usage.get("completion")
    )
    return (int(prompt) if prompt is not None else None,
            int(completion) if completion is not None else None)


class ChaiBackend(InferenceBackend):
    def __init__(self, api_key: str, default_user_name: str = _DEFAULT_USER_NAME) -> None:
        self._api_key = api_key
        self._default_user_name = default_user_name
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0),
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=10),
        )

    def _build_chat_history(self, request: ChatRequest) -> list[dict]:
        # The Chai API has no dedicated system-prompt field; the convention is to
        # inject it as the first bot message so the model treats it as prior context.
        user_name = request.user_name or self._default_user_name
        bot_name = request.bot_name or _DEFAULT_BOT_NAME
        history: list[dict] = []
        if request.system_prompt:
            history.append({"sender": bot_name, "message": request.system_prompt})
        for m in request.messages:
            sender = user_name if m.role == "user" else bot_name
            history.append({"sender": sender, "message": m.content})
        return history

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
        retry=_RETRYABLE,
        after=_count_retry,
        reraise=True,
    )
    async def chat(self, request: ChatRequest) -> InferenceResult:
        bot_name = request.bot_name or _DEFAULT_BOT_NAME
        user_name = request.user_name or self._default_user_name
        log.debug("chai.request", bot_name=bot_name, messages=len(request.messages))

        t0 = time.perf_counter()
        response = await self._client.post(
            _API_URL,
            headers={"Authorization": f"Bearer {self._api_key}"},
            json={
                "memory": "",
                "prompt": "",
                "bot_name": bot_name,
                "user_name": user_name,
                "chat_history": self._build_chat_history(request),
            },
        )
        PROVIDER_REQUEST_DURATION.labels(provider=_PROVIDER).observe(time.perf_counter() - t0)

        response.raise_for_status()
        data = response.json()
        # "model_output" is the current Chai field; "response" is the legacy fallback.
        content = data.get("model_output") or data.get("response")
        if not content:
            raise ValueError(f"Unexpected Chai API response shape: {list(data.keys())}")

        prompt_tokens, completion_tokens = _extract_tokens(data)
        log.debug("chai.response", chars=len(content), estimated=prompt_tokens is None)
        return InferenceResult(
            content=content,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
        )

    async def health_check(self) -> bool:
        try:
            r = await self._client.get(_HEALTH_URL, timeout=5.0)
            return r.is_success
        except Exception:
            return False

    async def aclose(self) -> None:
        await self._client.aclose()
