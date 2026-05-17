from dataclasses import dataclass, replace
from typing import Optional

from backend.catalog import BUILT_IN_CHARACTERS
from backend.core.models import Character
from backend.core.settings import Settings
from backend.inference.interface import ChatRequest, InferenceBackend


@dataclass
class ChatResult:
    content: str
    prompt_tokens: int
    completion_tokens: int
    estimated: bool


class ChatService:
    def __init__(self, backend: InferenceBackend, settings: Settings) -> None:
        self._backend = backend
        self._default_model = settings.default_model

    def characters(self) -> list[Character]:
        return BUILT_IN_CHARACTERS

    async def chat(self, request: ChatRequest) -> ChatResult:
        if not request.model:
            request = replace(request, model=self._default_model)

        prompt_chars = sum(len(m.content) for m in request.messages)
        content = await self._backend.chat(request)

        return ChatResult(
            content=content,
            prompt_tokens=prompt_chars // 4,
            completion_tokens=len(content) // 4,
            estimated=True,
        )
