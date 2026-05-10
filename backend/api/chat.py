from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from backend.inference.interface import ChatMessage
from backend.inference.echo import EchoBackend

router = APIRouter()

# Swap this out for AnthropicBackend, OpenAIBackend, etc.
_backend = EchoBackend()


class MessageDTO(BaseModel):
    role: str
    content: str


class ChatRequestDTO(BaseModel):
    messages: list[MessageDTO]
    model: str = "default"


class ChatResponseDTO(BaseModel):
    role: str = "assistant"
    content: str
    model: str


@router.post("/chat", response_model=ChatResponseDTO)
async def chat(req: ChatRequestDTO) -> ChatResponseDTO:
    messages = [ChatMessage(role=m.role, content=m.content) for m in req.messages]
    content = await _backend.chat(messages, req.model)
    return ChatResponseDTO(content=content, model=req.model)


@router.websocket("/chat/stream")
async def chat_stream(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()
            req = ChatRequestDTO(**data)
            messages = [ChatMessage(role=m["role"], content=m["content"]) for m in data["messages"]]
            async for chunk in _backend.stream_chat(messages, req.model):
                await ws.send_json({"delta": chunk, "done": False})
            await ws.send_json({"delta": "", "done": True})
    except WebSocketDisconnect:
        pass
