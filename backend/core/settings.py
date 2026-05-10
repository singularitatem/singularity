from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Character(BaseModel):
    id: str
    name: str
    bot_name: str  # sent to the inference API
    description: str
    emoji: str = "🤖"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    env: str = "development"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    provider: str = "chai"
    default_model: str = "default"
    default_character_id: str = "einstein"

    # Chai
    chai_api_key: str = "CR_14d43f2bf78b4b0590c2a8b87f354746"
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
                id="socrates",
                name="Socrates",
                bot_name="Socrates",
                description="Ancient philosopher. Guides through questions rather than answers.",
                emoji="🏛️",
            ),
            Character(
                id="ada",
                name="Ada Lovelace",
                bot_name="Ada",
                description="Pioneer of computing. Thinks in patterns, algorithms, and poetry.",
                emoji="💻",
            ),
            Character(
                id="tesla",
                name="Tesla",
                bot_name="Tesla",
                description="Visionary inventor. Dreams in electricity and resonant frequencies.",
                emoji="⚡",
            ),
        ]
    )
