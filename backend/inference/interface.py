from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class ChatMessage:
    role: str  # "user" | "assistant"
    content: str


@dataclass
class ChatRequest:
    messages: list[ChatMessage]
    model: str
    bot_name: Optional[str] = None
    user_name: Optional[str] = None
    system_prompt: Optional[str] = None


@dataclass
class InferenceResult:
    content: str
    # When the provider reports real token counts, set these and estimated=False.
    # When None, ChatService falls back to tiktoken estimation.
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None


class InferenceBackend(ABC):
    @abstractmethod
    async def chat(self, request: ChatRequest) -> InferenceResult: ...

    async def health_check(self) -> bool:
        return True

    async def aclose(self) -> None:
        pass
