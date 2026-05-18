import httpx
import structlog
from fastapi import APIRouter, Depends, HTTPException
from slowapi import Limiter
from starlette.requests import Request

from backend.api.deps import get_chat_service, get_real_ip, require_api_key
from backend.api.schemas.chat import (
    CharacterDTO,
    ChatRequestDTO,
    ChatResponseDTO,
    Usage,
    VoiceInferenceRequest,
    VoiceInferenceResponse,
)
from backend.telemetry.metrics import CHAT_REQUEST_TOTAL
from backend.services.chat import ChatService
from backend.services.voice import infer_voice_profile

log = structlog.get_logger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_real_ip)

# Set by create_app() from Settings.chat_rate_limit so operators can tune via env.
# A lambda lets tests override this at runtime without restarting the process.
_CHAT_RATE_LIMIT = "30/minute"


@router.get("/characters", response_model=list[CharacterDTO])
async def list_characters(
    service: ChatService = Depends(get_chat_service),
    _: None = Depends(require_api_key),
) -> list[CharacterDTO]:
    return service.characters()


@router.get("/characters/{character_id}", response_model=CharacterDTO)
async def get_character(
    character_id: str,
    service: ChatService = Depends(get_chat_service),
    _: None = Depends(require_api_key),
) -> CharacterDTO:
    match = next((c for c in service.characters() if c.id == character_id), None)
    if match is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return match


@router.post("/characters/voice", response_model=VoiceInferenceResponse)
async def infer_voice(
    req: VoiceInferenceRequest,
    service: ChatService = Depends(get_chat_service),
    _: None = Depends(require_api_key),
) -> VoiceInferenceResponse:
    try:
        return await infer_voice_profile(
            name=req.name,
            bot_name=req.bot_name,
            description=req.description,
            system_prompt=req.system_prompt,
            service=service,
        )
    except Exception as exc:
        log.warning("voice.inference_failed", error=str(exc))
        raise HTTPException(status_code=502, detail="Voice inference failed")


@router.post("/chat", response_model=ChatResponseDTO)
@limiter.limit(lambda: _CHAT_RATE_LIMIT)
async def chat(
    request: Request,
    req: ChatRequestDTO,
    service: ChatService = Depends(get_chat_service),
    _: None = Depends(require_api_key),
) -> ChatResponseDTO:
    log.info("chat.request", bot_name=req.bot_name, messages=len(req.messages))
    try:
        result = await service.chat(req.to_domain())
    except httpx.HTTPStatusError as exc:
        http_status = exc.response.status_code
        if http_status == 429:
            CHAT_REQUEST_TOTAL.labels(status="upstream_429").inc()
            log.warning("chat.upstream_rate_limited")
            raise HTTPException(status_code=429, detail="Upstream rate limited — please try again.")
        CHAT_REQUEST_TOTAL.labels(status="upstream_error").inc()
        log.warning("chat.upstream_error", status=http_status)
        raise HTTPException(status_code=502, detail=f"Upstream API error {http_status}")
    except Exception:
        CHAT_REQUEST_TOTAL.labels(status="error").inc()
        log.exception("chat.unexpected_error")
        raise HTTPException(status_code=500, detail="Unexpected error")

    CHAT_REQUEST_TOTAL.labels(status="success").inc()
    return ChatResponseDTO(
        content=result.content,
        model=req.model,
        usage=Usage(
            prompt_tokens=result.prompt_tokens,
            completion_tokens=result.completion_tokens,
            total_tokens=result.prompt_tokens + result.completion_tokens,
            estimated=result.estimated,
        ),
    )


