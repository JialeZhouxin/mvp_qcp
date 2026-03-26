from typing import Protocol

from app.models.task import TaskType
from app.services.task_submit_service import TaskSubmitService
from app.services.task_query_models import UserTaskResultView, UserTaskStatusView
from app.services.task_query_service import TaskAccessDeniedError, TaskNotFoundError
from app.services.task_submit_shared import (
    TaskSubmitCommand,
    TaskSubmitOutcome,
    TaskSubmitOverloadedError,
    TaskSubmitQueuePublishError,
    TaskSubmitValidationError,
)


class UserTaskQueryPort(Protocol):
    def get_status_view(self, tenant_id: int, user_id: int, task_id: int) -> UserTaskStatusView:
        ...

    def get_result_view(self, tenant_id: int, user_id: int, task_id: int) -> UserTaskResultView:
        ...


class SubmitTaskUseCase:
    def __init__(self, service: TaskSubmitService) -> None:
        self._service = service

    def execute(self, tenant_id: int, user_id: int, code: str, idempotency_key: str | None) -> TaskSubmitOutcome:
        return self._service.submit(
            TaskSubmitCommand(
                tenant_id=tenant_id,
                user_id=user_id,
                task_type=TaskType.CODE,
                code=code,
                raw_idempotency_key=idempotency_key,
            )
        )


class SubmitCircuitTaskUseCase:
    def __init__(self, service: TaskSubmitService) -> None:
        self._service = service

    def execute(self, tenant_id: int, user_id: int, payload_json: str, idempotency_key: str | None) -> TaskSubmitOutcome:
        return self._service.submit(
            TaskSubmitCommand(
                tenant_id=tenant_id,
                user_id=user_id,
                task_type=TaskType.CIRCUIT,
                payload_json=payload_json,
                raw_idempotency_key=idempotency_key,
            )
        )


class GetTaskStatusUseCase:
    def __init__(self, query: UserTaskQueryPort) -> None:
        self._query = query

    def execute(self, tenant_id: int, user_id: int, task_id: int) -> UserTaskStatusView:
        return self._query.get_status_view(tenant_id, user_id, task_id)


class GetTaskResultUseCase:
    def __init__(self, query: UserTaskQueryPort) -> None:
        self._query = query

    def execute(self, tenant_id: int, user_id: int, task_id: int) -> UserTaskResultView:
        return self._query.get_result_view(tenant_id, user_id, task_id)


__all__ = [
    "GetTaskResultUseCase",
    "GetTaskStatusUseCase",
    "SubmitCircuitTaskUseCase",
    "SubmitTaskUseCase",
    "TaskAccessDeniedError",
    "TaskNotFoundError",
    "TaskSubmitOverloadedError",
    "TaskSubmitQueuePublishError",
    "TaskSubmitValidationError",
]
