import json

import httpx
import pytest
import respx

from backend.inference.chai_backend import ChaiBackend, _API_URL
from backend.inference.interface import ChatMessage, ChatRequest


def make_request(content: str = "hello", bot_name: str = "Einstein") -> ChatRequest:
    return ChatRequest(
        messages=[ChatMessage(role="user", content=content)],
        model="default",
        bot_name=bot_name,
    )


@respx.mock
@pytest.mark.asyncio
async def test_chat_returns_model_output():
    respx.post(_API_URL).mock(
        return_value=httpx.Response(200, json={"model_output": "Hello there!"})
    )
    backend = ChaiBackend(api_key="test-key")
    result = await backend.chat(make_request())
    assert result == "Hello there!"
    await backend.aclose()


@respx.mock
@pytest.mark.asyncio
async def test_chat_falls_back_to_response_key():
    respx.post(_API_URL).mock(return_value=httpx.Response(200, json={"response": "Hi!"}))
    backend = ChaiBackend(api_key="test-key")
    result = await backend.chat(make_request())
    assert result == "Hi!"
    await backend.aclose()


@respx.mock
@pytest.mark.asyncio
async def test_chat_raises_on_unknown_response_shape():
    respx.post(_API_URL).mock(return_value=httpx.Response(200, json={"unexpected": "field"}))
    backend = ChaiBackend(api_key="test-key")
    with pytest.raises(ValueError, match="Unexpected Chai API response shape"):
        await backend.chat(make_request())
    await backend.aclose()


@respx.mock
@pytest.mark.asyncio
async def test_chat_raises_on_4xx():
    respx.post(_API_URL).mock(return_value=httpx.Response(401))
    backend = ChaiBackend(api_key="bad-key")
    with pytest.raises(httpx.HTTPStatusError):
        await backend.chat(make_request())
    await backend.aclose()


@respx.mock
@pytest.mark.asyncio
async def test_bot_name_appears_in_history():
    captured = {}

    def capture(request, route):
        captured["body"] = request.content
        return httpx.Response(200, json={"model_output": "ok"})

    respx.post(_API_URL).mock(side_effect=capture)
    backend = ChaiBackend(api_key="test-key")
    req = ChatRequest(
        messages=[
            ChatMessage(role="user", content="hi"),
            ChatMessage(role="assistant", content="hello"),
        ],
        model="default",
        bot_name="Luna",
    )
    await backend.chat(req)
    body = json.loads(captured["body"])
    senders = [m["sender"] for m in body["chat_history"]]
    assert "Luna" in senders
    assert "Bot" not in senders
    await backend.aclose()
