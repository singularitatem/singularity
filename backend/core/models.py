from typing import Optional

from pydantic import BaseModel


class Character(BaseModel):
    id: str
    name: str
    bot_name: str
    description: str
    emoji: str = "🤖"
    system_prompt: Optional[str] = None


class VoiceProfile(BaseModel):
    pitch: float
    rate: float
    gender: str
    accent: str
