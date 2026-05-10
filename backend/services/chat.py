from typing import AsyncIterator
from backend.core.settings import Settings, Character
from backend.inference.interface import InferenceBackend, ChatRequest


class ChatService:
    def __init__(self, backend: InferenceBackend, settings: Settings) -> None:
        self._backend = backend
        self._settings = settings

    def characters(self) -> list[Character]:
        return self._settings.characters

    async def chat(self, request: ChatRequest) -> str:
        request.model = request.model or self._settings.default_model
        return await self._backend.chat(request)

    async def stream_chat(self, request: ChatRequest) -> AsyncIterator[str]:
        request.model = request.model or self._settings.default_model
        async for chunk in self._backend.stream_chat(request):
            yield chunk
