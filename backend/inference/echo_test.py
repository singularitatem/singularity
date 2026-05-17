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
    backend = EchoBackend()
    result = await backend.chat(make_request("hello"))
    assert "hello" in result


@pytest.mark.asyncio
async def test_chat_empty_messages():
    backend = EchoBackend()
    result = await backend.chat(ChatRequest(messages=[], model="default"))
    assert isinstance(result, str)


