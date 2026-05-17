from backend.inference.interface import ChatRequest, InferenceBackend


class EchoBackend(InferenceBackend):
    """No-op backend that echoes the last user message. Used for local dev and tests."""

    async def chat(self, request: ChatRequest) -> str:
        last = next((m for m in reversed(request.messages) if m.role == "user"), None)
        return f"[echo] {last.content if last else ''}"
