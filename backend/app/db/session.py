from typing import Generator, Protocol

from sqlalchemy.engine import Engine
from sqlmodel import Session, create_engine

from app.core.config import settings
from app.db.base import metadata


def _build_engine() -> Engine:
    return create_engine(
        settings.database_url,
        echo=False,
        connect_args={},
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
        pool_recycle=settings.database_pool_recycle_seconds,
        pool_pre_ping=True,
    )


engine = _build_engine()


def init_db() -> None:
    metadata.create_all(engine)


class SessionFactory(Protocol):
    def __call__(self) -> Session: ...


def create_session() -> Session:
    return Session(engine)


def get_session() -> Generator[Session, None, None]:
    with create_session() as session:
        yield session
