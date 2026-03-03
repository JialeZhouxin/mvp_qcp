from pathlib import Path
from typing import Generator

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings


def _normalize_database_url(database_url: str) -> str:
    """将 SQLite 相对路径标准化为基于 backend 根目录的绝对路径。"""
    if not database_url.startswith("sqlite:///"):
        return database_url

    db_path_text = database_url.replace("sqlite:///", "", 1)
    if db_path_text == ":memory:":
        return database_url

    backend_root = Path(__file__).resolve().parents[2]
    db_path = Path(db_path_text)
    if not db_path.is_absolute():
        db_path = (backend_root / db_path).resolve()

    db_path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{db_path.as_posix()}"


normalized_database_url = _normalize_database_url(settings.database_url)

engine = create_engine(
    normalized_database_url,
    echo=False,
    connect_args={"check_same_thread": False} if normalized_database_url.startswith("sqlite:///") else {},
)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
