import httpx
from typing import AsyncIterator
from backend.inference.interface import InferenceBackend, ChatRequest

_API_URL = "http://guanaco-submitter.guanaco-backend.k2.chaiverse.com/endpoints/onsite/chat"
_DEFAULT_BOT_NAME = "Einstein"
_DEFAULT_USER_NAME = "User"


class ChaiBackend(InferenceBackend):
    def __init__(self, api_key: str, default_user_name: str = _DEFAULT_USER_NAME) -> None:
        self._api_key = api_key
        self._default_user_name = default_user_name
        self._client = httpx.AsyncClient(timeout=30.0)

    def _to_chat_history(self, request: ChatRequest) -> list[dict]:
        user_name = request.user_name or self._default_user_name
        result = []
        if request.system_prompt:
            result.append({"sender": "Bot", "message": request.system_prompt})
        for m in request.messages:
            sender = user_name if m.role == "user" else "Bot"
            result.append({"sender": sender, "message": m.content})
        return result

    async def chat(self, request: ChatRequest) -> str:
        bot_name = request.bot_name or _DEFAULT_BOT_NAME
        user_name = request.user_name or self._default_user_name
        response = await self._client.post(
            _API_URL,
            headers={"Authorization": f"Bearer {self._api_key}"},
            json={
                "memory": "",
                "prompt": "",
                "bot_name": bot_name,
                "user_name": user_name,
                "chat_history": self._to_chat_history(request),
            },
        )
        response.raise_for_status()
        data = response.json()
        return data.get("model_output") or data.get("response") or str(data)

    async def stream_chat(self, request: ChatRequest) -> AsyncIterator[str]:
        text = await self.chat(request)
        for word in text.split():
            yield word + " "

    async def aclose(self) -> None:
        await self._client.aclose()
