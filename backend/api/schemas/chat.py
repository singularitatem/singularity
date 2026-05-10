from pydantic import BaseModel
from backend.inference.interface import ChatMessage, ChatRequest


class MessageDTO(BaseModel):
    role: str
    content: str


class ChatRequestDTO(BaseModel):
    messages: list[MessageDTO]
    model: str = "default"

    def to_domain(self) -> ChatRequest:
        return ChatRequest(
            messages=[ChatMessage(role=m.role, content=m.content) for m in self.messages],
            model=self.model,
        )


class ChatResponseDTO(BaseModel):
    role: str = "assistant"
    content: str
    model: str
