from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator


@dataclass
class ChatMessage:
    role: str  # "user" | "assistant" | "system"
    content: str


class InferenceBackend(ABC):
    @abstractmethod
    async def chat(self, messages: list[ChatMessage], model: str) -> str: ...

    @abstractmethod
    async def stream_chat(
        self, messages: list[ChatMessage], model: str
    ) -> AsyncIterator[str]:
        yield  # makes this an async generator in subclasses
