import json
from datetime import datetime
from typing import Any

from sqlmodel import Session

from app.models.task import Task, TaskStatus
from app.services.task_error_payload import build_error_payload

TERMINAL_TASK_STATUSES = frozenset(
    {
        TaskStatus.SUCCESS,
        TaskStatus.FAILURE,
        TaskStatus.TIMEOUT,
        TaskStatus.RETRY_EXHAUSTED,
    }
)


def is_terminal_status(status: TaskStatus) -> bool:
    return status in TERMINAL_TASK_STATUSES


def _duration_ms(task: Task, finished_at: datetime) -> int | None:
    if task.started_at is None:
        return None
    elapsed = finished_at - task.started_at
    return max(int(elapsed.total_seconds() * 1000), 0)


class TaskLifecycleService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def start_attempt(self, task: Task, now: datetime | None = None) -> Task:
        if is_terminal_status(task.status):
            raise ValueError(f"cannot start terminal task: {task.id} status={task.status}")
        started_at = now or datetime.utcnow()
        if task.started_at is None:
            task.started_at = started_at
        task.status = TaskStatus.RUNNING
        task.attempt_count += 1
        task.updated_at = started_at
        task.error_message = None
        self._persist(task)
        return task

    def mark_success(self, task: Task, result: dict[str, Any], now: datetime | None = None) -> None:
        self._assert_mutable(task)
        finished_at = now or datetime.utcnow()
        task.status = TaskStatus.SUCCESS
        task.result_json = json.dumps(result, ensure_ascii=False)
        task.error_message = None
        task.finished_at = finished_at
        task.duration_ms = _duration_ms(task, finished_at)
        task.updated_at = finished_at
        self._persist(task)

    def mark_failure(self, task: Task, error_code: str, message: str, now: datetime | None = None) -> None:
        self._mark_error_terminal(task, TaskStatus.FAILURE, error_code, message, now)

    def mark_timeout(self, task: Task, message: str, now: datetime | None = None) -> None:
        self._mark_error_terminal(task, TaskStatus.TIMEOUT, "EXECUTION_TIMEOUT", message, now)

    def mark_retry_exhausted(
        self,
        task: Task,
        error_code: str,
        message: str,
        now: datetime | None = None,
    ) -> None:
        self._mark_error_terminal(task, TaskStatus.RETRY_EXHAUSTED, error_code, message, now)

    def _mark_error_terminal(
        self,
        task: Task,
        status: TaskStatus,
        error_code: str,
        message: str,
        now: datetime | None,
    ) -> None:
        self._assert_mutable(task)
        finished_at = now or datetime.utcnow()
        payload = build_error_payload(error_code, message)
        task.status = status
        task.result_json = None
        task.error_message = json.dumps(payload, ensure_ascii=False)
        task.finished_at = finished_at
        task.duration_ms = _duration_ms(task, finished_at)
        task.updated_at = finished_at
        self._persist(task)

    def _assert_mutable(self, task: Task) -> None:
        if is_terminal_status(task.status):
            raise ValueError(f"cannot transition terminal task: {task.id} status={task.status}")

    def _persist(self, task: Task) -> None:
        self._session.add(task)
        self._session.commit()
        self._session.refresh(task)
