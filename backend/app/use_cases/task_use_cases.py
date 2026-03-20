import json
import logging
from dataclasses import dataclass
from typing import Any

from sqlmodel import Session, select

from app.models.task import Task, TaskStatus
from app.services.task_submit_service import (
    TaskSubmitCommand,
    TaskSubmitOutcome,
    TaskSubmitOverloadedError,
    TaskSubmitQueuePublishError,
    TaskSubmitService,
    TaskSubmitValidationError,
)

logger = logging.getLogger(__name__)


def _parse_json_or_none(raw: str | None) -> Any | None:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw


class TaskLookupError(RuntimeError):
    pass


class TaskNotFoundError(TaskLookupError):
    pass


class TaskAccessDeniedError(TaskLookupError):
    pass


def _load_user_task(session: Session, task_id: int, user_id: int, action: str) -> Task:
    task = session.exec(select(Task).where(Task.id == task_id)).first()
    if task is None:
        logger.info("event=%s_not_found task_id=%s user_id=%s", action, task_id, user_id)
        raise TaskNotFoundError("task not found")
    if task.user_id != user_id:
        logger.warning(
            "event=%s_forbidden task_id=%s owner_id=%s user_id=%s",
            action,
            task_id,
            task.user_id,
            user_id,
        )
        raise TaskAccessDeniedError("task not found")
    return task


@dataclass(frozen=True)
class UserTaskStatusView:
    task_id: int
    status: str
    error_message: Any | None


@dataclass(frozen=True)
class UserTaskResultView:
    task_id: int
    status: str
    result: Any | None
    message: str | None


class SubmitTaskUseCase:
    def __init__(self, service: TaskSubmitService) -> None:
        self._service = service

    def execute(self, user_id: int, code: str, idempotency_key: str | None) -> TaskSubmitOutcome:
        return self._service.submit(
            TaskSubmitCommand(
                user_id=user_id,
                code=code,
                raw_idempotency_key=idempotency_key,
            )
        )


class GetTaskStatusUseCase:
    def __init__(self, session: Session) -> None:
        self._session = session

    def execute(self, user_id: int, task_id: int) -> UserTaskStatusView:
        task = _load_user_task(self._session, task_id, user_id, action="task_status")
        return UserTaskStatusView(
            task_id=task.id or 0,
            status=task.status.value,
            error_message=_parse_json_or_none(task.error_message),
        )


class GetTaskResultUseCase:
    def __init__(self, session: Session) -> None:
        self._session = session

    def execute(self, user_id: int, task_id: int) -> UserTaskResultView:
        task = _load_user_task(self._session, task_id, user_id, action="task_result")

        message = None
        if task.status in {TaskStatus.PENDING, TaskStatus.RUNNING}:
            message = "task not finished"
        elif task.status in {TaskStatus.FAILURE, TaskStatus.TIMEOUT, TaskStatus.RETRY_EXHAUSTED}:
            message = "task failed"

        return UserTaskResultView(
            task_id=task.id or 0,
            status=task.status.value,
            result=_parse_json_or_none(task.result_json),
            message=message,
        )


__all__ = [
    "GetTaskResultUseCase",
    "GetTaskStatusUseCase",
    "SubmitTaskUseCase",
    "TaskAccessDeniedError",
    "TaskNotFoundError",
    "TaskSubmitOverloadedError",
    "TaskSubmitQueuePublishError",
    "TaskSubmitValidationError",
]
