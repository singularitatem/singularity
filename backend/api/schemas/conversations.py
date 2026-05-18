from datetime import datetime

from pydantic import BaseModel


class MessageResponseDTO(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime


class ConversationSummaryDTO(BaseModel):
    id: str
    title: str
    character_id: str
    created_at: datetime
    updated_at: datetime
    message_count: int


class ConversationResponseDTO(BaseModel):
    id: str
    title: str
    character_id: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponseDTO]


class CreateConversationDTO(BaseModel):
    id: str
    title: str = "New conversation"
    character_id: str
    created_at: datetime
    updated_at: datetime


class UpdateConversationDTO(BaseModel):
    title: str
