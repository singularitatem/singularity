import pytest
from fastapi.testclient import TestClient
from backend.app import create_app
from backend.core.settings import Settings


@pytest.fixture
def settings() -> Settings:
    return Settings(provider="echo", default_model="test-model")


@pytest.fixture
def client(settings: Settings):
    with TestClient(create_app(settings)) as c:
        yield c
