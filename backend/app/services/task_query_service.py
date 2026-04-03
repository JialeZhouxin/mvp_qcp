import logging
import json
from typing import Any

from sqlalchemy import func
from sqlmodel import Session, select

from app.models.task import Task, TaskStatus
from app.services.task_query_models import (
    TaskDetailView,
    TaskDiagnosticView,
    TaskListItemView,
    TaskListView,
    UserTaskResultView,
    UserTaskStatusView,
)
from app.services.error_diagnostic_service import normalize_task_diagnostic
from app.services.task_lifecycle import TaskLifecycleService

logger = logging.getLogger(__name__)


class TaskLookupError(RuntimeError):
    pass


class TaskNotFoundError(TaskLookupError):
    pass


class TaskAccessDeniedError(TaskLookupError):
    pass


def _parse_json_or_none(raw: str | None) -> dict[str, Any] | None:
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if isinstance(parsed, dict):
        return parsed
    return None


def _parse_task_status(status_filter: str | None) -> TaskStatus | None:
    if status_filter is None:
        return None
    normalized = status_filter.strip().upper()
    if not normalized:
        return None
    try:
        return TaskStatus[normalized]
    except KeyError as exc:
        raise ValueError(f"unsupported task status filter: {status_filter}") from exc


def _build_diagnostic(raw_error: str | None) -> TaskDiagnosticView | None:
    payload = _parse_json_or_none(raw_error)
    if payload is None:
        return None
    normalized = normalize_task_diagnostic(payload)
    suggestions = normalized.get("suggestions")
    return TaskDiagnosticView(
        code=str(normalized["code"]),
        message=str(normalized["message"]),
        phase=str(normalized["phase"]),
        summary=str(normalized["summary"]),
        suggestions=[str(item) for item in suggestions] if isinstance(suggestions, list) else [],
    )


class TaskQueryService:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_status_view(self, tenant_id: int, user_id: int, task_id: int) -> UserTaskStatusView:
        task = self._load_user_task(task_id, tenant_id, user_id, action="task_status")
        return UserTaskStatusView(
            task_id=task.id or 0,
            status=task.status.value,
            task_type=task.task_type.value,
            error_message=_parse_json_or_none(task.error_message),
        )

    def get_result_view(self, tenant_id: int, user_id: int, task_id: int) -> UserTaskResultView:
        task = self._load_user_task(task_id, tenant_id, user_id, action="task_result")

        message = None
        if task.status in {TaskStatus.PENDING, TaskStatus.RUNNING}:
            message = "task not finished"
        elif task.status == TaskStatus.CANCELLED:
            message = "task cancelled"
        elif task.status in {TaskStatus.FAILURE, TaskStatus.TIMEOUT, TaskStatus.RETRY_EXHAUSTED}:
            message = "task failed"

        return UserTaskResultView(
            task_id=task.id or 0,
            status=task.status.value,
            task_type=task.task_type.value,
            result=_parse_json_or_none(task.result_json),
            message=message,
        )

    def list_tasks(
        self,
        tenant_id: int,
        user_id: int,
        status_filter: str | None,
        limit: int,
        offset: int,
    ) -> TaskListView:
        normalized_status = _parse_task_status(status_filter)
        query = select(Task).where(Task.tenant_id == tenant_id, Task.user_id == user_id)
        count_query = select(func.count()).select_from(Task).where(Task.tenant_id == tenant_id, Task.user_id == user_id)
        if normalized_status is not None:
            query = query.where(Task.status == normalized_status)
            count_query = count_query.where(Task.status == normalized_status)

        tasks = self._session.exec(
            query.order_by(Task.created_at.desc()).offset(offset).limit(limit)
        ).all()
        total = int(self._session.exec(count_query).one())
        return TaskListView(
            items=[
                TaskListItemView(
                    task_id=task.id or 0,
                    status=task.status.value,
                    task_type=task.task_type.value,
                    created_at=task.created_at,
                    updated_at=task.updated_at,
                    duration_ms=task.duration_ms,
                    attempt_count=task.attempt_count,
                    has_result=task.result_json is not None,
                )
                for task in tasks
            ],
            total=total,
            limit=limit,
            offset=offset,
        )

    def get_task_detail(self, tenant_id: int, user_id: int, task_id: int) -> TaskDetailView | None:
        statement = select(Task).where(Task.id == task_id, Task.tenant_id == tenant_id, Task.user_id == user_id)
        task = self._session.exec(statement).first()
        if task is None:
            return None
        return TaskDetailView(
            task_id=task.id or 0,
            status=task.status.value,
            task_type=task.task_type.value,
            created_at=task.created_at,
            updated_at=task.updated_at,
            started_at=task.started_at,
            finished_at=task.finished_at,
            duration_ms=task.duration_ms,
            attempt_count=task.attempt_count,
            result=_parse_json_or_none(task.result_json),
            diagnostic=_build_diagnostic(task.error_message),
        )

    def cancel_task(self, tenant_id: int, user_id: int, task_id: int) -> UserTaskStatusView:
        task = self._load_user_task(task_id, tenant_id, user_id, action="task_cancel")
        if task.status in {TaskStatus.PENDING, TaskStatus.RUNNING}:
            TaskLifecycleService(self._session).mark_cancelled(task)
        return UserTaskStatusView(
            task_id=task.id or 0,
            status=task.status.value,
            task_type=task.task_type.value,
            error_message=_parse_json_or_none(task.error_message),
        )

    def _load_user_task(self, task_id: int, tenant_id: int, user_id: int, action: str) -> Task:
        task = self._session.exec(select(Task).where(Task.id == task_id)).first()
        if task is None:
            logger.info("event=%s_not_found task_id=%s tenant_id=%s user_id=%s", action, task_id, tenant_id, user_id)
            raise TaskNotFoundError("task not found")
        if task.tenant_id != tenant_id or task.user_id != user_id:
            logger.warning(
                "event=%s_forbidden task_id=%s tenant_id=%s owner_id=%s user_id=%s",
                action,
                task_id,
                tenant_id,
                task.user_id,
                user_id,
            )
            raise TaskAccessDeniedError("task not found")
        return task
