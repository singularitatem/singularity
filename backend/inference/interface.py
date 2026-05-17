from abc import ABC, abstractmethod
from dataclasses import dataclass
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
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


class InferenceBackend(ABC):
    @abstractmethod
    async def chat(self, request: ChatRequest) -> str: ...

    async def health_check(self) -> bool:
        return True

    async def aclose(self) -> None:
        pass
