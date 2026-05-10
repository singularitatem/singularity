from typing import AsyncIterator
from backend.inference.interface import InferenceBackend, ChatMessage


class EchoBackend(InferenceBackend):
    """No-op backend that echoes the last user message. Useful for local dev."""

    async def chat(self, messages: list[ChatMessage], model: str) -> str:
        last = next((m for m in reversed(messages) if m.role == "user"), None)
        return f"[echo] {last.content if last else ''}"

    async def stream_chat(
        self, messages: list[ChatMessage], model: str
    ) -> AsyncIterator[str]:
        response = await self.chat(messages, model)
        for word in response.split():
            yield word + " "
