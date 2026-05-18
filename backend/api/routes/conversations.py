import structlog
from fastapi import APIRouter, Depends, HTTPException

from backend.api.deps import get_conversation_service, require_api_key
from backend.api.schemas.conversations import (
    ConversationResponseDTO,
    ConversationSummaryDTO,
    CreateConversationDTO,
    UpdateConversationDTO,
)
from backend.services.conversation import ConversationService

log = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/conversations", response_model=list[ConversationSummaryDTO])
async def list_conversations(
    service: ConversationService = Depends(get_conversation_service),
    _: None = Depends(require_api_key),
) -> list[ConversationSummaryDTO]:
    return await service.list_conversations()


@router.post("/conversations", response_model=ConversationResponseDTO, status_code=201)
async def create_conversation(
    dto: CreateConversationDTO,
    service: ConversationService = Depends(get_conversation_service),
    _: None = Depends(require_api_key),
) -> ConversationResponseDTO:
    return await service.create_conversation(dto)


@router.get("/conversations/{conversation_id}", response_model=ConversationResponseDTO)
async def get_conversation(
    conversation_id: str,
    service: ConversationService = Depends(get_conversation_service),
    _: None = Depends(require_api_key),
) -> ConversationResponseDTO:
    conv = await service.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    service: ConversationService = Depends(get_conversation_service),
    _: None = Depends(require_api_key),
) -> None:
    deleted = await service.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponseDTO)
async def update_conversation(
    conversation_id: str,
    dto: UpdateConversationDTO,
    service: ConversationService = Depends(get_conversation_service),
    _: None = Depends(require_api_key),
) -> ConversationResponseDTO:
    updated = await service.update_title(conversation_id, dto.title)
    if not updated:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return updated
