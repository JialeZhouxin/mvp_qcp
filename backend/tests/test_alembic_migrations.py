from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_alembic_upgrade_head_creates_multitenant_schema() -> None:
    database_url = (
        "postgresql+psycopg://qcp:QcpDev_2026_Strong!@127.0.0.1:5432/qcp_test_alembic"
    )
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    command.downgrade(config, "base")
    command.upgrade(config, "head")

    inspector = inspect(create_engine(database_url))
    table_names = set(inspector.get_table_names())

    assert {"tenant", "user", "task", "project", "idempotencyrecord"}.issubset(
        table_names
    )
    task_columns = {column["name"] for column in inspector.get_columns("task")}
    assert {"task_type", "payload_json"}.issubset(task_columns)
    nullable_map = {
        column["name"]: column["nullable"] for column in inspector.get_columns("task")
    }
    assert nullable_map["code"] is True
