from datetime import datetime

from sqlmodel import select

from app.db.session import SessionFactory, create_session
from app.models.task import Task
from app.schemas.task_stream import TaskHeartbeatEvent, TaskStatusStreamEvent

MAX_STREAM_TASKS = 200


class TaskEventStreamService:
    def __init__(
        self,
        poll_interval_seconds: float = 1.0,
        heartbeat_seconds: float = 10.0,
        session_factory: SessionFactory = create_session,
    ) -> None:
        self.poll_interval_seconds = poll_interval_seconds
        self.heartbeat_seconds = heartbeat_seconds
        self._session_factory = session_factory

    def list_changed_tasks(
        self,
        user_id: int,
        watched_task_ids: set[int] | None,
        versions: dict[int, str],
    ) -> tuple[list[TaskStatusStreamEvent], dict[int, str]]:
        tasks = self._load_tasks(user_id, watched_task_ids)
        next_versions = dict(versions)
        changed: list[TaskStatusStreamEvent] = []
        for task in tasks:
            if task.id is None:
                continue
            version = self._to_version(task)
            if versions.get(task.id) != version:
                changed.append(self._to_event_payload(task))
            next_versions[task.id] = version
        return changed, next_versions

    def build_heartbeat(self) -> TaskHeartbeatEvent:
        return TaskHeartbeatEvent(timestamp=datetime.utcnow())

    def _load_tasks(self, user_id: int, watched_task_ids: set[int] | None) -> list[Task]:
        statement = select(Task).where(Task.user_id == user_id)
        if watched_task_ids:
            statement = statement.where(Task.id.in_(watched_task_ids))
        statement = statement.order_by(Task.updated_at.desc()).limit(MAX_STREAM_TASKS)
        with self._session_factory() as session:
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

    def _to_event_payload(self, task: Task) -> TaskStatusStreamEvent:
        return TaskStatusStreamEvent(
            task_id=task.id or 0,
            status=task.status.value,
            updated_at=task.updated_at,
            duration_ms=task.duration_ms,
            attempt_count=task.attempt_count,
        )
