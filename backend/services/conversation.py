import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.api.schemas.conversations import (
    ConversationResponseDTO,
    ConversationSummaryDTO,
    CreateConversationDTO,
    MessageResponseDTO,
)
from backend.db.models import Conversation, Message


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _to_summary(conv: Conversation) -> ConversationSummaryDTO:
    return ConversationSummaryDTO(
        id=conv.id,
        title=conv.title,
        character_id=conv.character_id,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=len(conv.messages),
    )


def _to_response(conv: Conversation) -> ConversationResponseDTO:
    return ConversationResponseDTO(
        id=conv.id,
        title=conv.title,
        character_id=conv.character_id,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[
            MessageResponseDTO(
                id=m.id,
                role=m.role,
                content=m.content,
                created_at=m.created_at,
            )
            for m in conv.messages
        ],
    )


class ConversationService:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._sf = session_factory

    async def list_conversations(self) -> list[ConversationSummaryDTO]:
        async with self._sf() as session:
            rows = await session.execute(
                select(Conversation).order_by(Conversation.updated_at.desc())
            )
            return [_to_summary(c) for c in rows.scalars()]

    async def get_conversation(self, conv_id: str) -> Optional[ConversationResponseDTO]:
        async with self._sf() as session:
            row = await session.get(Conversation, conv_id)
            return _to_response(row) if row else None

    async def create_conversation(self, dto: CreateConversationDTO) -> ConversationResponseDTO:
        async with self._sf() as session:
            existing = await session.get(Conversation, dto.id)
            if existing:
                return _to_response(existing)
            conv = Conversation(
                id=dto.id,
                title=dto.title,
                character_id=dto.character_id,
                created_at=dto.created_at.replace(tzinfo=None),
                updated_at=dto.updated_at.replace(tzinfo=None),
            )
            session.add(conv)
            await session.commit()
            await session.refresh(conv)
            return _to_response(conv)

    async def delete_conversation(self, conv_id: str) -> bool:
        async with self._sf() as session:
            conv = await session.get(Conversation, conv_id)
            if not conv:
                return False
            await session.delete(conv)
            await session.commit()
            return True

    async def update_title(self, conv_id: str, title: str) -> Optional[ConversationResponseDTO]:
        async with self._sf() as session:
            conv = await session.get(Conversation, conv_id)
            if not conv:
                return None
            conv.title = title
            conv.updated_at = _now()
            await session.commit()
            await session.refresh(conv)
            return _to_response(conv)

    async def append_turn(
        self,
        conv_id: str,
        character_id: str,
        user_content: str,
        assistant_content: str,
        timestamp: Optional[datetime] = None,
    ) -> None:
        """Persist a user+assistant exchange to an existing (or auto-created) conversation."""
        ts = (timestamp or _now()).replace(tzinfo=None)
        async with self._sf() as session:
            conv = await session.get(Conversation, conv_id)
            if not conv:
                conv = Conversation(
                    id=conv_id,
                    title="New conversation",
                    character_id=character_id,
                    created_at=ts,
                    updated_at=ts,
                )
                session.add(conv)
            else:
                conv.updated_at = ts

            session.add(
                Message(
                    id=str(uuid.uuid4()),
                    conversation_id=conv_id,
                    role="user",
                    content=user_content,
                    created_at=ts,
                )
            )
            session.add(
                Message(
                    id=str(uuid.uuid4()),
                    conversation_id=conv_id,
                    role="assistant",
                    content=assistant_content,
                    created_at=ts,
                )
            )
            await session.commit()
