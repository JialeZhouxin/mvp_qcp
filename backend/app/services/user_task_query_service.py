import json
import logging
from dataclasses import dataclass

from sqlmodel import Session, select

from app.models.task import Task, TaskStatus

TaskErrorMessagePayload = dict[str, object] | str
TaskResultPayload = dict[str, object]

logger = logging.getLogger(__name__)


class TaskLookupError(RuntimeError):
    pass


class TaskNotFoundError(TaskLookupError):
    pass


class TaskAccessDeniedError(TaskLookupError):
    pass


@dataclass(frozen=True)
class UserTaskStatusView:
    task_id: int
    status: str
    error_message: TaskErrorMessagePayload | None


@dataclass(frozen=True)
class UserTaskResultView:
    task_id: int
    status: str
    result: TaskResultPayload | None
    message: str | None


def _parse_error_message(raw: str | None) -> TaskErrorMessagePayload | None:
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return raw
    if isinstance(parsed, dict):
        return parsed
    return raw


def _parse_result_payload(raw: str | None) -> TaskResultPayload | None:
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if isinstance(parsed, dict):
        return parsed
    return None


class UserTaskQueryService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_status_view(self, user_id: int, task_id: int) -> UserTaskStatusView:
        task = self._load_user_task(task_id, user_id, action="task_status")
        return UserTaskStatusView(
            task_id=task.id or 0,
            status=task.status.value,
            error_message=_parse_error_message(task.error_message),
        )

    def get_result_view(self, user_id: int, task_id: int) -> UserTaskResultView:
        task = self._load_user_task(task_id, user_id, action="task_result")

        message = None
        if task.status in {TaskStatus.PENDING, TaskStatus.RUNNING}:
            message = "task not finished"
        elif task.status in {TaskStatus.FAILURE, TaskStatus.TIMEOUT, TaskStatus.RETRY_EXHAUSTED}:
            message = "task failed"

        return UserTaskResultView(
            task_id=task.id or 0,
            status=task.status.value,
            result=_parse_result_payload(task.result_json),
            message=message,
        )

    def _load_user_task(self, task_id: int, user_id: int, action: str) -> Task:
        task = self._session.exec(select(Task).where(Task.id == task_id)).first()
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
