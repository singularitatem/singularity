from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from backend.api.schemas.chat import CharacterDTO, ChatRequestDTO, ChatResponseDTO
from backend.api.deps import get_chat_service
from backend.services.chat import ChatService

router = APIRouter()


@router.get("/characters", response_model=list[CharacterDTO])
async def list_characters(
    service: ChatService = Depends(get_chat_service),
) -> list[CharacterDTO]:
    return [CharacterDTO(**c.model_dump()) for c in service.characters()]


@router.post("/chat", response_model=ChatResponseDTO)
async def chat(
    req: ChatRequestDTO,
    service: ChatService = Depends(get_chat_service),
) -> ChatResponseDTO:
    content = await service.chat(req.to_domain())
    return ChatResponseDTO(content=content, model=req.model)


@router.websocket("/chat/stream")
async def chat_stream(ws: WebSocket) -> None:
    service: ChatService = ws.app.state.chat_service
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()
            req = ChatRequestDTO(**data)
            async for chunk in service.stream_chat(req.to_domain()):
                await ws.send_json({"delta": chunk, "done": False})
            await ws.send_json({"delta": "", "done": True})
    except WebSocketDisconnect:
        pass
