import pytest

from backend.core.settings import Settings
from backend.inference.echo import EchoBackend
from backend.inference.interface import ChatMessage, ChatRequest, InferenceResult
from backend.services.chat import ChatService


@pytest.fixture
def service() -> ChatService:
    return ChatService(backend=EchoBackend(), settings=Settings())


@pytest.mark.asyncio
async def test_chat_returns_result(service):
    req = ChatRequest(messages=[ChatMessage(role="user", content="hello")], model="default")
    result = await service.chat(req)
    assert "hello" in result.content
    assert result.prompt_tokens >= 0
    assert result.completion_tokens >= 0
    assert result.estimated is True  # EchoBackend never returns provider counts


@pytest.mark.asyncio
async def test_chat_usage_totals(service):
    req = ChatRequest(messages=[ChatMessage(role="user", content="hello world")], model="default")
    result = await service.chat(req)
    assert result.prompt_tokens + result.completion_tokens >= 0


@pytest.mark.asyncio
async def test_chat_empty_model_uses_default(service):
    req = ChatRequest(messages=[ChatMessage(role="user", content="hi")], model="")
    result = await service.chat(req)
    assert isinstance(result.content, str)


@pytest.mark.asyncio
async def test_provider_reported_tokens_not_estimated():
    class ProviderBackend(EchoBackend):
        async def chat(self, request):
            r = await super().chat(request)
            return InferenceResult(content=r.content, prompt_tokens=20, completion_tokens=8)

    svc = ChatService(backend=ProviderBackend(), settings=Settings())
    req = ChatRequest(messages=[ChatMessage(role="user", content="hi")], model="default")
    result = await svc.chat(req)
    assert result.estimated is False
    assert result.prompt_tokens == 20
    assert result.completion_tokens == 8


@pytest.mark.asyncio
async def test_characters_returns_list(service):
    chars = service.characters()
    assert len(chars) > 0
    assert all(c.id and c.name for c in chars)
