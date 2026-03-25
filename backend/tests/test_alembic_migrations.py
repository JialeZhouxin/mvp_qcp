from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_alembic_upgrade_head_creates_multitenant_schema(tmp_path) -> None:
    database_url = f"sqlite:///{tmp_path / 'alembic.db'}"
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(config, "head")

    inspector = inspect(create_engine(database_url))
    table_names = set(inspector.get_table_names())

    assert {"tenant", "user", "task", "project", "idempotencyrecord"}.issubset(table_names)
