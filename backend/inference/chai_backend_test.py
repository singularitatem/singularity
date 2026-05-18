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
    respx.post(_API_URL).mock(return_value=httpx.Response(200, json={"model_output": "Hello!"}))
    backend = ChaiBackend(api_key="test-key")
    result = await backend.chat(make_request())
    assert result.content == "Hello!"
    assert result.prompt_tokens is None  # Chai did not include usage
    await backend.aclose()


@respx.mock
@pytest.mark.asyncio
async def test_chat_falls_back_to_response_key():
    respx.post(_API_URL).mock(return_value=httpx.Response(200, json={"response": "Hi!"}))
    backend = ChaiBackend(api_key="test-key")
    result = await backend.chat(make_request())
    assert result.content == "Hi!"
    await backend.aclose()


@respx.mock
@pytest.mark.asyncio
async def test_chat_uses_provider_token_counts_when_present():
    payload = {"model_output": "Hello!", "usage": {"prompt_tokens": 10, "completion_tokens": 5}}
    respx.post(_API_URL).mock(return_value=httpx.Response(200, json=payload))
    backend = ChaiBackend(api_key="test-key")
    result = await backend.chat(make_request())
    assert result.prompt_tokens == 10
    assert result.completion_tokens == 5
    await backend.aclose()


@respx.mock
@pytest.mark.asyncio
async def test_chat_raises_on_unknown_shape():
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
async def test_bot_name_used_as_history_sender():
    """Assistant messages must use bot_name as sender, not the literal string 'Bot'."""
    captured: dict = {}

    def capture(request, route):
        captured["body"] = json.loads(request.content)
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
    senders = [m["sender"] for m in captured["body"]["chat_history"]]
    assert "Luna" in senders
    assert "Bot" not in senders
    await backend.aclose()


@respx.mock
@pytest.mark.asyncio
async def test_system_prompt_injected_as_first_bot_message():
    captured: dict = {}

    def capture(request, route):
        captured["body"] = json.loads(request.content)
        return httpx.Response(200, json={"model_output": "ok"})

    respx.post(_API_URL).mock(side_effect=capture)
    backend = ChaiBackend(api_key="test-key")
    req = ChatRequest(
        messages=[ChatMessage(role="user", content="hi")],
        model="default",
        bot_name="Einstein",
        system_prompt="You are Einstein.",
    )
    await backend.chat(req)
    history = captured["body"]["chat_history"]
    assert history[0]["sender"] == "Einstein"
    assert history[0]["message"] == "You are Einstein."
    await backend.aclose()
