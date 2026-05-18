import pytest

from backend.inference.echo import EchoBackend
from backend.inference.interface import ChatMessage, ChatRequest


def make_request(*contents: str) -> ChatRequest:
    return ChatRequest(
        messages=[ChatMessage(role="user", content=c) for c in contents],
        model="default",
    )


@pytest.mark.asyncio
async def test_chat_echoes_last_user_message():
    result = await EchoBackend().chat(make_request("hello"))
    assert "hello" in result


@pytest.mark.asyncio
async def test_chat_empty_messages_returns_string():
    result = await EchoBackend().chat(ChatRequest(messages=[], model="default"))
    assert isinstance(result, str)


@pytest.mark.asyncio
async def test_health_check_returns_true():
    assert await EchoBackend().health_check() is True
