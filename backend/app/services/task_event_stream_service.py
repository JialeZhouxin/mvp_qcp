from datetime import datetime
from typing import Any

from sqlmodel import Session, select

from app.db.session import engine
from app.models.task import Task

MAX_STREAM_TASKS = 200


class TaskEventStreamService:
    def __init__(self, poll_interval_seconds: float = 1.0, heartbeat_seconds: float = 10.0) -> None:
        self.poll_interval_seconds = poll_interval_seconds
        self.heartbeat_seconds = heartbeat_seconds

    def list_changed_tasks(
        self,
        user_id: int,
        watched_task_ids: set[int] | None,
        versions: dict[int, str],
    ) -> tuple[list[dict[str, Any]], dict[int, str]]:
        tasks = self._load_tasks(user_id, watched_task_ids)
        next_versions = dict(versions)
        changed: list[dict[str, Any]] = []
        for task in tasks:
            if task.id is None:
                continue
            version = self._to_version(task)
            if versions.get(task.id) != version:
                changed.append(self._to_event_payload(task))
            next_versions[task.id] = version
        return changed, next_versions

    def build_heartbeat(self) -> dict[str, str]:
        return {"timestamp": datetime.utcnow().isoformat()}

    def _load_tasks(self, user_id: int, watched_task_ids: set[int] | None) -> list[Task]:
        statement = select(Task).where(Task.user_id == user_id)
        if watched_task_ids:
            statement = statement.where(Task.id.in_(watched_task_ids))
        statement = statement.order_by(Task.updated_at.desc()).limit(MAX_STREAM_TASKS)
        with Session(engine) as session:
            return list(session.exec(statement).all())

    def _to_version(self, task: Task) -> str:
        return "|".join(
            [
                task.status.value,
                task.updated_at.isoformat(),
                str(task.attempt_count),
                str(task.duration_ms),
            ]
        )

    def _to_event_payload(self, task: Task) -> dict[str, Any]:
        return {
            "task_id": task.id or 0,
            "status": task.status.value,
            "updated_at": task.updated_at.isoformat(),
            "duration_ms": task.duration_ms,
            "attempt_count": task.attempt_count,
        }
