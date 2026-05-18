from backend.inference.interface import ChatRequest, InferenceBackend, InferenceResult


class EchoBackend(InferenceBackend):
    """No-op backend that echoes the last user message. Used for local dev and tests."""

    async def chat(self, request: ChatRequest) -> InferenceResult:
        last = next((m for m in reversed(request.messages) if m.role == "user"), None)
        return InferenceResult(content=f"[echo] {last.content if last else ''}")
