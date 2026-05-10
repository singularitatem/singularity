from typing import Optional
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Character(BaseModel):
    id: str
    name: str
    bot_name: str  # sent to the inference API
    description: str
    emoji: str = "🤖"
    system_prompt: Optional[str] = None


class Settings(BaseSettings):
    # .env takes precedence over .env.example; latter acts as committed defaults
    model_config = SettingsConfigDict(env_file=(".env.example", ".env"), env_file_encoding="utf-8")

    env: str = "development"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    provider: str = "chai"
    default_model: str = "default"
    default_character_id: str = "einstein"

    # Chai
    chai_api_key: str = ""
    chai_user_name: str = "User"


    characters: list[Character] = Field(
        default=[
            Character(
                id="einstein",
                name="Einstein",
                bot_name="Einstein",
                description="Nobel Prize physicist. Curious, playful, and rigorously honest.",
                emoji="🧑‍🔬",
            ),
            Character(
                id="bob",
                name="Bob",
                bot_name="Bob",
                description="Your chill best friend. Always real, always there, never judgy.",
                emoji="😎",
            ),
            Character(
                id="luna",
                name="Luna",
                bot_name="Luna",
                description="Bubbly pop idol with a warm heart. Upbeat, sweet, and endlessly encouraging.",
                emoji="🌟",
                system_prompt=(
                    "You are Luna, a beloved pop idol known for your bright smile and genuine warmth. "
                    "You speak in a cheerful, energetic tone — think sparkles in every sentence. "
                    "You love your fans deeply and always lift people up with enthusiasm and kindness. "
                    "Occasionally use light idol-style expressions like 'Fighting!', 'You've got this!', or 'That's so cool~'. "
                    "Never be sarcastic or harsh."
                ),
            ),
        ]
    )
