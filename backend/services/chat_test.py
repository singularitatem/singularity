import pytest

from backend.core.settings import Settings
from backend.inference.echo import EchoBackend
from backend.inference.interface import ChatMessage, ChatRequest
from backend.services.chat import ChatResult, ChatService


@pytest.fixture
def service() -> ChatService:
    return ChatService(backend=EchoBackend(), settings=Settings())


@pytest.mark.asyncio
async def test_chat_returns_result(service: ChatService):
    req = ChatRequest(messages=[ChatMessage(role="user", content="hello")], model="default")
    result = await service.chat(req)
    assert isinstance(result, ChatResult)
    assert "hello" in result.content


@pytest.mark.asyncio
async def test_chat_empty_model_falls_back_to_default(service: ChatService):
    req = ChatRequest(messages=[ChatMessage(role="user", content="hi")], model="")
    result = await service.chat(req)
    assert isinstance(result, ChatResult)
    assert result.content


@pytest.mark.asyncio
async def test_chat_token_counts_are_non_negative(service: ChatService):
    req = ChatRequest(messages=[ChatMessage(role="user", content="ping")], model="default")
    result = await service.chat(req)
    assert result.prompt_tokens >= 0
    assert result.completion_tokens >= 0
    assert result.estimated is True
