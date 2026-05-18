from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # .env takes precedence over .env.example; latter acts as committed defaults
    model_config = SettingsConfigDict(env_file=(".env.example", ".env"), env_file_encoding="utf-8")

    env: str = "development"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    provider: str = "chai"
    default_model: str = "default"

    # Authentication — empty list disables auth (open dev mode)
    api_keys: list[str] = []

    # Rate limiting
    chat_rate_limit: str = "30/minute"
    default_rate_limit: str = "60/minute"

    # Trusted reverse-proxy IPs — X-Forwarded-For / X-Real-IP are only
    # honoured when the direct connecting IP is in this list.
    # Empty (default) means all rate-limit keys use the direct connection IP.
    trusted_proxies: list[str] = []

    # Database
    db_url: str = "sqlite+aiosqlite:///./singularity.db"

    # Chai
    chai_api_key: str = ""
    chai_user_name: str = "User"
