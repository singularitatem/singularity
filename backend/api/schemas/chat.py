from typing import Optional
from pydantic import BaseModel
from backend.inference.interface import ChatMessage, ChatRequest


class MessageDTO(BaseModel):
    role: str
    content: str


class ChatRequestDTO(BaseModel):
    messages: list[MessageDTO]
    model: str = "default"
    bot_name: Optional[str] = None
    user_name: Optional[str] = None
    system_prompt: Optional[str] = None

    def to_domain(self) -> ChatRequest:
        return ChatRequest(
            messages=[ChatMessage(role=m.role, content=m.content) for m in self.messages],
            model=self.model,
            bot_name=self.bot_name,
            user_name=self.user_name,
            system_prompt=self.system_prompt,
        )


class ChatResponseDTO(BaseModel):
    role: str = "assistant"
    content: str
    model: str


class CharacterDTO(BaseModel):
    id: str
    name: str
    bot_name: str
    description: str
    emoji: str
    system_prompt: Optional[str] = None
