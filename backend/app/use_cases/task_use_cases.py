import json
from collections.abc import Callable
from typing import Any, Protocol

from app.models.task import TaskType
from app.services.circuit_executor_heartbeat import is_circuit_executor_available
from app.services.circuit_payload import CircuitPayloadValidationError, normalize_circuit_payload
from app.services.hybrid_payload import HybridPayloadValidationError, normalize_hybrid_payload
from app.services.task_submit_service import TaskSubmitService
from app.services.task_query_models import UserTaskResultView, UserTaskStatusView
from app.services.task_query_service import TaskAccessDeniedError, TaskNotFoundError
from app.services.task_submit_shared import (
    TaskSubmitDependencyUnavailableError,
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

    def cancel_task(self, tenant_id: int, user_id: int, task_id: int) -> UserTaskStatusView:
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
    def __init__(
        self,
        service: TaskSubmitService,
        *,
        availability_checker: Callable[[], bool] | None = None,
        payload_normalizer: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
    ) -> None:
        self._service = service
        self._availability_checker = availability_checker or is_circuit_executor_available
        self._payload_normalizer = payload_normalizer or normalize_circuit_payload

    def execute(
        self,
        tenant_id: int,
        user_id: int,
        payload: dict[str, Any],
        idempotency_key: str | None,
    ) -> TaskSubmitOutcome:
        if not self._availability_checker():
            raise TaskSubmitDependencyUnavailableError(
                code="CIRCUIT_EXECUTOR_UNAVAILABLE",
                message="circuit executor unavailable",
            )
        try:
            normalized_payload = self._payload_normalizer(payload)
        except CircuitPayloadValidationError as exc:
            raise TaskSubmitValidationError(code=exc.code, message=exc.message) from exc

        return self._service.submit(
            TaskSubmitCommand(
                tenant_id=tenant_id,
                user_id=user_id,
                task_type=TaskType.CIRCUIT,
                payload_json=json.dumps(normalized_payload, ensure_ascii=False, separators=(",", ":")),
                raw_idempotency_key=idempotency_key,
            )
        )


class SubmitHybridTaskUseCase:
    def __init__(
        self,
        service: TaskSubmitService,
        *,
        payload_normalizer: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
    ) -> None:
        self._service = service
        self._payload_normalizer = payload_normalizer or normalize_hybrid_payload

    def execute(
        self,
        tenant_id: int,
        user_id: int,
        payload: dict[str, Any],
        idempotency_key: str | None,
    ) -> TaskSubmitOutcome:
        try:
            normalized_payload = self._payload_normalizer(payload)
        except HybridPayloadValidationError as exc:
            raise TaskSubmitValidationError(code=exc.code, message=exc.message) from exc

        return self._service.submit(
            TaskSubmitCommand(
                tenant_id=tenant_id,
                user_id=user_id,
                task_type=TaskType.HYBRID,
                payload_json=json.dumps(normalized_payload, ensure_ascii=False, separators=(",", ":")),
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


class CancelTaskUseCase:
    def __init__(self, query: UserTaskQueryPort) -> None:
        self._query = query

    def execute(self, tenant_id: int, user_id: int, task_id: int) -> UserTaskStatusView:
        return self._query.cancel_task(tenant_id, user_id, task_id)


__all__ = [
    "GetTaskResultUseCase",
    "GetTaskStatusUseCase",
    "CancelTaskUseCase",
    "SubmitCircuitTaskUseCase",
    "SubmitHybridTaskUseCase",
    "SubmitTaskUseCase",
    "TaskAccessDeniedError",
    "TaskSubmitDependencyUnavailableError",
    "TaskNotFoundError",
    "TaskSubmitOverloadedError",
    "TaskSubmitQueuePublishError",
    "TaskSubmitValidationError",
]
