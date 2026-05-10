from typing import AsyncIterator, Optional
from backend.core.settings import Settings
from backend.inference.interface import InferenceBackend, ChatRequest


class ChatService:
    def __init__(self, backend: InferenceBackend, settings: Settings) -> None:
        self._backend = backend
        self._settings = settings

    async def chat(self, request: ChatRequest) -> str:
        request.model = request.model or self._settings.default_model
        return await self._backend.chat(request)

    async def stream_chat(self, request: ChatRequest) -> AsyncIterator[str]:
        request.model = request.model or self._settings.default_model
        async for chunk in self._backend.stream_chat(request):
            yield chunk
