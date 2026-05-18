from typing import Literal, Optional

from pydantic import BaseModel

from backend.core.models import Character, VoiceProfile
from backend.inference.interface import ChatMessage, ChatRequest


class MessageDTO(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequestDTO(BaseModel):
    messages: list[MessageDTO]
    model: str = "default"
    bot_name: Optional[str] = None
    user_name: Optional[str] = None
    system_prompt: Optional[str] = None
    # Persistence fields — optional, for clients that want server-side conversation storage.
    conversation_id: Optional[str] = None
    character_id: Optional[str] = None

    def to_domain(self) -> ChatRequest:
        return ChatRequest(
            messages=[ChatMessage(role=m.role, content=m.content) for m in self.messages],
            model=self.model,
            bot_name=self.bot_name,
            user_name=self.user_name,
            system_prompt=self.system_prompt,
        )


class Usage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated: bool  # True when token counts are approximated, not reported by the provider


class ChatResponseDTO(BaseModel):
    role: str = "assistant"
    content: str
    model: str
    usage: Usage


# Re-export domain models as API types; fields are identical so no mapping needed.
CharacterDTO = Character
VoiceInferenceResponse = VoiceProfile


class VoiceInferenceRequest(BaseModel):
    name: str
    bot_name: Optional[str] = None
    description: str
    system_prompt: Optional[str] = None
