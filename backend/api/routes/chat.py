import re
import httpx
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from backend.api.schemas.chat import CharacterDTO, ChatRequestDTO, ChatResponseDTO, VoiceInferenceRequest, VoiceInferenceResponse
from backend.api.deps import get_chat_service
from backend.inference.interface import ChatMessage, ChatRequest
from backend.services.chat import ChatService

router = APIRouter()


@router.get("/characters", response_model=list[CharacterDTO])
async def list_characters(
    service: ChatService = Depends(get_chat_service),
) -> list[CharacterDTO]:
    return [CharacterDTO(**c.model_dump()) for c in service.characters()]


@router.get("/characters/{character_id}", response_model=CharacterDTO)
async def get_character(
    character_id: str,
    service: ChatService = Depends(get_chat_service),
) -> CharacterDTO:
    match = next((c for c in service.characters() if c.id == character_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Character not found")
    return CharacterDTO(**match.model_dump())


_VOICE_QUESTION = (
    "In two or three sentences, describe your speaking voice. "
    "Mention whether you are male or female, whether your voice is high-pitched or low-pitched, "
    "and whether you speak quickly or slowly."
)


def _parse_voice(text: str) -> VoiceInferenceResponse:
    t = text.lower()

    # Gender
    female = len(re.findall(r'\b(female|woman|feminine|lady|girl|she|her)\b', t))
    male   = len(re.findall(r'\b(male|man|masculine|gentleman|boy|he|him|his|deep|gruff|gravelly|baritone)\b', t))
    gender = "female" if female > male else "male" if male > 0 else "neutral"

    # Pitch
    if re.search(r'\b(high.pitch|high pitch|squeaky|shrill|light|airy|bright|soprano)\b', t):
        pitch = 1.25
    elif re.search(r'\b(low.pitch|low pitch|deep|bass|gravelly|gruff|booming|baritone|rumbling)\b', t):
        pitch = 0.75
    elif gender == "female":
        pitch = 1.1
    elif gender == "male":
        pitch = 0.9
    else:
        pitch = 1.0

    # Rate
    if re.search(r'\b(fast|quick|rapid|swift|hurried|brisk|energetic)\b', t):
        rate = 1.15
    elif re.search(r'\b(slow|deliberate|measured|careful|gentle|calm|wise|aged|ancient|methodical|paced)\b', t):
        rate = 0.78
    else:
        rate = 0.93

    # Accent
    if re.search(r'\b(british|england|london|uk|cockney|oxford|eton)\b', t):
        accent = "british"
    elif re.search(r'\b(australian|australia|sydney|mate)\b', t):
        accent = "australian"
    elif re.search(r'\b(irish|ireland|dublin)\b', t):
        accent = "irish"
    elif re.search(r'\b(scottish|scotland|edinburgh|highland)\b', t):
        accent = "scottish"
    else:
        accent = "neutral"

    return VoiceInferenceResponse(pitch=pitch, rate=rate, gender=gender, accent=accent)


@router.post("/characters/voice", response_model=VoiceInferenceResponse)
async def infer_voice(
    req: VoiceInferenceRequest,
    service: ChatService = Depends(get_chat_service),
) -> VoiceInferenceResponse:
    domain_req = ChatRequest(
        messages=[ChatMessage(role="user", content=_VOICE_QUESTION)],
        model="default",
        bot_name=req.bot_name or req.name,
        system_prompt=req.system_prompt,
    )
    try:
        raw = await service.chat(domain_req)
        return _parse_voice(raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Voice inference failed: {exc}")


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
            try:
                async for chunk in service.stream_chat(req.to_domain()):
                    await ws.send_json({"delta": chunk, "done": False})
                await ws.send_json({"delta": "", "done": True})
            except httpx.ReadTimeout:
                await ws.send_json({"error": "Request timed out — please try again.", "done": True})
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
                msg = "Rate limited — please wait a moment and try again." if status == 429 else f"API error {status} — please try again."
                await ws.send_json({"error": msg, "done": True})
            except Exception:
                await ws.send_json({"error": "Unexpected error — please try again.", "done": True})
    except WebSocketDisconnect:
        pass
