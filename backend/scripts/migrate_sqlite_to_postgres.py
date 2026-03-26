"""Migrate legacy SQLite data into the multitenant target schema."""

from __future__ import annotations

import logging
import os
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import Engine, MetaData, create_engine, inspect, select, text
from sqlalchemy.engine import RowMapping
from sqlmodel import Session

from app.db.base import metadata
from app.models.idempotency_record import IdempotencyRecord
from app.models.project import Project
from app.models.task import Task, TaskStatus, TaskType
from app.models.tenant import Tenant
from app.models.user import User
from app.services.tenant_naming import build_tenant_slug, ensure_unique_tenant_slug

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class MigrationCounts:
    users: int
    tenants: int
    tasks: int
    projects: int
    idempotency_records: int


def _create_engine(database_url: str) -> Engine:
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    return create_engine(database_url, connect_args=connect_args)


def _assert_target_is_empty(target_engine: Engine) -> None:
    with Session(target_engine) as session:
        for model in (Tenant, User, Task, Project, IdempotencyRecord):
            if session.exec(select(model)).first() is not None:
                raise ValueError("target database must be empty before migration")


def _reflect_legacy_metadata(source_engine: Engine) -> MetaData:
    legacy_metadata = MetaData()
    legacy_metadata.reflect(bind=source_engine, only=["user", "task", "project", "idempotencyrecord"])
    return legacy_metadata


def _load_rows(source_engine: Engine, table_name: str, legacy_metadata: MetaData) -> list[RowMapping]:
    table = legacy_metadata.tables[table_name]
    with source_engine.connect() as connection:
        return list(connection.execute(select(table)).mappings())


def _reset_sqlite_sequence(target_engine: Engine, table_name: str) -> None:
    if target_engine.dialect.name != "sqlite":
        return
    with target_engine.begin() as connection:
        if inspect(target_engine).has_table("sqlite_sequence"):
            connection.execute(text("DELETE FROM sqlite_sequence WHERE name = :table_name"), {"table_name": table_name})


def _reset_postgres_sequence(target_engine: Engine, table_name: str) -> None:
    if target_engine.dialect.name != "postgresql":
        return
    with target_engine.begin() as connection:
        connection.execute(
            text(
                f"SELECT setval(pg_get_serial_sequence('\"{table_name}\"', 'id'), "
                f"COALESCE((SELECT MAX(id) FROM \"{table_name}\"), 1), true)"
            )
        )


def _reset_sequences(target_engine: Engine, table_names: Iterable[str]) -> None:
    for table_name in table_names:
        _reset_sqlite_sequence(target_engine, table_name)
        _reset_postgres_sequence(target_engine, table_name)


def _count_rows(target_engine: Engine) -> MigrationCounts:
    with Session(target_engine) as session:
        return MigrationCounts(
            users=len(session.exec(select(User)).all()),
            tenants=len(session.exec(select(Tenant)).all()),
            tasks=len(session.exec(select(Task)).all()),
            projects=len(session.exec(select(Project)).all()),
            idempotency_records=len(session.exec(select(IdempotencyRecord)).all()),
        )


def migrate_sqlite_to_database(source_url: str, target_url: str) -> MigrationCounts:
    """Migrate a legacy single-tenant SQLite database into the target schema."""
    source_engine = _create_engine(source_url)
    target_engine = _create_engine(target_url)

    inspector = inspect(target_engine)
    target_tables = set(inspector.get_table_names())
    required_tables = set(metadata.tables.keys())
    if not required_tables.issubset(target_tables):
        raise ValueError("target database schema is missing required tables; run alembic upgrade head first")

    _assert_target_is_empty(target_engine)
    legacy_metadata = _reflect_legacy_metadata(source_engine)

    legacy_users = _load_rows(source_engine, "user", legacy_metadata)
    legacy_tasks = _load_rows(source_engine, "task", legacy_metadata)
    legacy_projects = _load_rows(source_engine, "project", legacy_metadata)
    legacy_records = _load_rows(source_engine, "idempotencyrecord", legacy_metadata)
    valid_task_ids = {int(legacy_task["id"]) for legacy_task in legacy_tasks}

    tenant_mapping: dict[int, int] = {}

    with Session(target_engine) as session:
        for legacy_user in legacy_users:
            now = legacy_user["created_at"] or datetime.utcnow()
            tenant = Tenant(
                id=legacy_user["id"],
                slug=ensure_unique_tenant_slug(session, build_tenant_slug(legacy_user["username"])),
                name=f"{legacy_user['username']} workspace",
                created_at=now,
                updated_at=now,
            )
            session.add(tenant)
            session.flush()
            tenant_mapping[int(legacy_user["id"])] = int(tenant.id or 0)

            user = User(
                id=legacy_user["id"],
                tenant_id=int(tenant.id or 0),
                username=legacy_user["username"],
                password_hash=legacy_user["password_hash"],
                password_salt=legacy_user["password_salt"],
                token=None,
                token_expires_at=None,
                created_at=legacy_user["created_at"] or now,
                updated_at=legacy_user["created_at"] or now,
            )
            session.add(user)

        session.flush()

        for legacy_task in legacy_tasks:
            tenant_id = tenant_mapping[int(legacy_task["user_id"])]
            task = Task(
                id=legacy_task["id"],
                tenant_id=tenant_id,
                user_id=legacy_task["user_id"],
                task_type=TaskType.CODE,
                code=legacy_task["code"],
                payload_json=None,
                status=TaskStatus(legacy_task["status"]),
                result_json=legacy_task["result_json"],
                error_message=legacy_task["error_message"],
                attempt_count=legacy_task["attempt_count"],
                started_at=legacy_task["started_at"],
                finished_at=legacy_task["finished_at"],
                duration_ms=legacy_task["duration_ms"],
                created_at=legacy_task["created_at"],
                updated_at=legacy_task["updated_at"],
            )
            session.add(task)

        session.flush()

        for legacy_project in legacy_projects:
            tenant_id = tenant_mapping[int(legacy_project["user_id"])]
            last_task_id = legacy_project["last_task_id"]
            if last_task_id is not None and int(last_task_id) not in valid_task_ids:
                logger.warning(
                    "dropping dangling project.last_task_id during migration",
                    extra={"project_id": legacy_project["id"], "last_task_id": last_task_id},
                )
                last_task_id = None
            project = Project(
                id=legacy_project["id"],
                tenant_id=tenant_id,
                user_id=legacy_project["user_id"],
                name=legacy_project["name"],
                entry_type=legacy_project["entry_type"],
                payload_json=legacy_project["payload_json"],
                last_task_id=last_task_id,
                created_at=legacy_project["created_at"],
                updated_at=legacy_project["updated_at"],
            )
            session.add(project)

        for legacy_record in legacy_records:
            tenant_id = tenant_mapping[int(legacy_record["user_id"])]
            record = IdempotencyRecord(
                id=legacy_record["id"],
                tenant_id=tenant_id,
                user_id=legacy_record["user_id"],
                idempotency_key=legacy_record["idempotency_key"],
                task_id=legacy_record["task_id"],
                expires_at=legacy_record["expires_at"],
                created_at=legacy_record["created_at"],
                updated_at=legacy_record["updated_at"],
            )
            session.add(record)

        session.commit()

    _reset_sequences(target_engine, metadata.tables.keys())
    counts = _count_rows(target_engine)
    logger.info("migration completed", extra={"counts": counts.__dict__})
    return counts


def main() -> None:
    """Run the SQLite to target database migration."""
    logging.basicConfig(level=logging.INFO)
    source_url = os.getenv("SQLITE_SOURCE_DATABASE_URL", "").strip()
    target_url = os.getenv("DATABASE_URL", "").strip()
    if not source_url:
        raise RuntimeError("SQLITE_SOURCE_DATABASE_URL is required")
    if not target_url:
        raise RuntimeError("DATABASE_URL is required")

    counts = migrate_sqlite_to_database(source_url, target_url)
    logger.info("migration summary", extra={"counts": counts.__dict__})


if __name__ == "__main__":
    main()
