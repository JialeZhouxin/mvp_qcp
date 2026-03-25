from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, MetaData, String, Table, create_engine
from sqlmodel import Session, SQLModel, select

from app.models.idempotency_record import IdempotencyRecord
from app.models.project import Project
from app.models.task import Task
from app.models.tenant import Tenant
from app.models.user import User
from scripts.migrate_sqlite_to_postgres import migrate_sqlite_to_database


def _create_legacy_schema(source_url: str) -> None:
    engine = create_engine(source_url)
    metadata = MetaData()

    Table(
        "user",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("username", String(50), nullable=False, unique=True),
        Column("password_hash", String, nullable=False),
        Column("password_salt", String, nullable=True),
        Column("token", String, nullable=True),
        Column("token_expires_at", DateTime, nullable=True),
        Column("created_at", DateTime, nullable=False),
    )
    Table(
        "task",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("user_id", Integer, nullable=False),
        Column("code", String, nullable=False),
        Column("status", String(32), nullable=False),
        Column("result_json", String, nullable=True),
        Column("error_message", String, nullable=True),
        Column("attempt_count", Integer, nullable=False),
        Column("started_at", DateTime, nullable=True),
        Column("finished_at", DateTime, nullable=True),
        Column("duration_ms", Integer, nullable=True),
        Column("created_at", DateTime, nullable=False),
        Column("updated_at", DateTime, nullable=False),
    )
    Table(
        "project",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("user_id", Integer, nullable=False),
        Column("name", String(80), nullable=False),
        Column("entry_type", String(16), nullable=False),
        Column("payload_json", String, nullable=False),
        Column("last_task_id", Integer, nullable=True),
        Column("created_at", DateTime, nullable=False),
        Column("updated_at", DateTime, nullable=False),
    )
    Table(
        "idempotencyrecord",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("user_id", Integer, nullable=False),
        Column("idempotency_key", String(255), nullable=False),
        Column("task_id", Integer, nullable=False),
        Column("expires_at", DateTime, nullable=True),
        Column("created_at", DateTime, nullable=False),
        Column("updated_at", DateTime, nullable=False),
    )

    metadata.create_all(engine)

    now = datetime(2026, 3, 25, 12, 0, 0)
    with engine.begin() as connection:
        connection.execute(
            metadata.tables["user"].insert(),
            [
                {
                    "id": 1,
                    "username": "alice",
                    "password_hash": "hash",
                    "password_salt": "salt",
                    "token": "legacy-token",
                    "token_expires_at": now,
                    "created_at": now,
                }
            ],
        )
        connection.execute(
            metadata.tables["task"].insert(),
            [
                {
                    "id": 10,
                    "user_id": 1,
                    "code": "def main():\n    return {'counts': {'00': 1}}",
                    "status": "SUCCESS",
                    "result_json": '{"counts": {"00": 1}}',
                    "error_message": None,
                    "attempt_count": 1,
                    "started_at": now,
                    "finished_at": now,
                    "duration_ms": 12,
                    "created_at": now,
                    "updated_at": now,
                }
            ],
        )
        connection.execute(
            metadata.tables["project"].insert(),
            [
                {
                    "id": 20,
                    "user_id": 1,
                    "name": "demo-project",
                    "entry_type": "CIRCUIT",
                    "payload_json": '{"circuit": []}',
                    "last_task_id": 10,
                    "created_at": now,
                    "updated_at": now,
                }
            ],
        )
        connection.execute(
            metadata.tables["idempotencyrecord"].insert(),
            [
                {
                    "id": 30,
                    "user_id": 1,
                    "idempotency_key": "same-key",
                    "task_id": 10,
                    "expires_at": now,
                    "created_at": now,
                    "updated_at": now,
                }
            ],
        )


def test_migrate_sqlite_to_database_bootstraps_tenants(tmp_path) -> None:
    source_url = f"sqlite:///{tmp_path / 'legacy.db'}"
    target_url = f"sqlite:///{tmp_path / 'target.db'}"
    _create_legacy_schema(source_url)

    target_engine = create_engine(target_url)
    SQLModel.metadata.create_all(target_engine)

    migrate_sqlite_to_database(source_url, target_url)

    with Session(target_engine) as session:
        tenant = session.exec(select(Tenant)).one()
        user = session.exec(select(User)).one()
        task = session.exec(select(Task)).one()
        project = session.exec(select(Project)).one()
        record = session.exec(select(IdempotencyRecord)).one()

        assert tenant.slug == "alice"
        assert tenant.name == "alice workspace"
        assert user.tenant_id == tenant.id
        assert user.token is None
        assert user.token_expires_at is None
        assert task.tenant_id == tenant.id
        assert project.tenant_id == tenant.id
        assert record.tenant_id == tenant.id
