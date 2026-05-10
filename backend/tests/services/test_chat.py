import pytest
from backend.inference.echo import EchoBackend
from backend.inference.interface import ChatMessage, ChatRequest
from backend.services.chat import ChatService
from backend.core.settings import Settings


@pytest.fixture
def service() -> ChatService:
    return ChatService(backend=EchoBackend(), settings=Settings())


@pytest.mark.asyncio
async def test_chat_returns_string(service: ChatService):
    req = ChatRequest(messages=[ChatMessage(role="user", content="hello")], model="default")
    result = await service.chat(req)
    assert isinstance(result, str)
    assert "hello" in result


@pytest.mark.asyncio
async def test_chat_uses_default_model_when_empty(service: ChatService):
    req = ChatRequest(messages=[ChatMessage(role="user", content="hi")], model="")
    await service.chat(req)
    assert req.model == service._settings.default_model


@pytest.mark.asyncio
async def test_stream_chat_yields_chunks(service: ChatService):
    req = ChatRequest(messages=[ChatMessage(role="user", content="ping")], model="default")
    chunks = [chunk async for chunk in service.stream_chat(req)]
    assert len(chunks) > 0
    assert "ping" in "".join(chunks)
