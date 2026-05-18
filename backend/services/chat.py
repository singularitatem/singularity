from dataclasses import dataclass, replace
from typing import Optional

import tiktoken

from backend.catalog import BUILT_IN_CHARACTERS
from backend.core.models import Character
from backend.core.settings import Settings
from backend.inference.interface import ChatRequest, InferenceBackend

# cl100k_base is the GPT-3.5/4 tokenizer — a reasonable proxy for any
# modern LLM when the provider does not expose real token counts.
_enc = tiktoken.get_encoding("cl100k_base")


def _count_tokens(text: str) -> int:
    return len(_enc.encode(text))


@dataclass
class ChatResult:
    content: str
    prompt_tokens: int
    completion_tokens: int
    estimated: bool
    model: str = ""


class ChatService:
    """Thin application layer wrapping an InferenceBackend with token counting."""

    def __init__(self, backend: InferenceBackend, settings: Settings) -> None:
        self._backend = backend
        self._default_model = settings.default_model

    def characters(self) -> list[Character]:
        return BUILT_IN_CHARACTERS

    async def chat(self, request: ChatRequest) -> ChatResult:
        if not request.model:
            request = replace(request, model=self._default_model)

        result = await self._backend.chat(request)

        if result.prompt_tokens is not None and result.completion_tokens is not None:
            # Provider reported real counts — use them as-is.
            prompt_tokens = result.prompt_tokens
            completion_tokens = result.completion_tokens
            estimated = False
        else:
            # Fall back to local tiktoken estimation.
            prompt_tokens = sum(_count_tokens(m.content) for m in request.messages)
            if request.system_prompt:
                prompt_tokens += _count_tokens(request.system_prompt)
            completion_tokens = _count_tokens(result.content)
            estimated = True

        return ChatResult(
            content=result.content,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            estimated=estimated,
            model=request.model or self._default_model,
        )
