from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.db.models import Base


def build_engine(db_url: str) -> AsyncEngine:
    # check_same_thread is SQLite-only; other drivers ignore it.
    return create_async_engine(db_url, connect_args={"check_same_thread": False})


def build_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


async def init_db(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
