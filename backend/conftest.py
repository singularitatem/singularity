import pytest
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.core.settings import Settings


@pytest.fixture
def settings() -> Settings:
    return Settings(provider="echo", default_model="test-model", db_url="sqlite+aiosqlite:///:memory:")


@pytest.fixture
def settings_with_auth() -> Settings:
    return Settings(
        provider="echo",
        default_model="test-model",
        api_keys=["test-key-1", "test-key-2"],
        db_url="sqlite+aiosqlite:///:memory:",
    )


@pytest.fixture
def client(settings: Settings):
    with TestClient(create_app(settings)) as c:
        yield c


@pytest.fixture
def authed_client(settings_with_auth: Settings):
    with TestClient(create_app(settings_with_auth)) as c:
        yield c
