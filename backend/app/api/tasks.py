from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlmodel import Session

from app.api.auth import get_current_user
from app.dependencies.task_submit import (
    build_submit_circuit_task_use_case,
    build_submit_hybrid_task_use_case,
    build_submit_task_use_case,
)
from app.db.session import get_session
from app.models.user import User
from app.schemas.task import (
    CircuitTaskSubmitRequest,
    HybridTaskSubmitRequest,
    TaskCancelResponse,
    TaskResultResponse,
    TaskStatusResponse,
    TaskSubmitRequest,
    TaskSubmitResponse,
)
from app.services.task_submit_shared import (
    TaskSubmitDependencyUnavailableError,
    TaskSubmitOverloadedError,
    TaskSubmitQueuePublishError,
    TaskSubmitValidationError,
)
from app.services.task_query_service import TaskQueryService
from app.use_cases.task_use_cases import (
    CancelTaskUseCase,
    GetTaskResultUseCase,
    GetTaskStatusUseCase,
    TaskAccessDeniedError,
    TaskNotFoundError,
)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _raise_submit_error(exc: Exception) -> None:
    if isinstance(exc, TaskSubmitValidationError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    if isinstance(exc, TaskSubmitDependencyUnavailableError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    if isinstance(exc, TaskSubmitOverloadedError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": exc.code, "message": "task queue overloaded"},
        ) from exc
    if isinstance(exc, TaskSubmitQueuePublishError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": exc.code, "message": "task enqueue failed"},
        ) from exc


@router.post("/submit", response_model=TaskSubmitResponse)
def submit_task(
    payload: TaskSubmitRequest,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskSubmitResponse:
    use_case = build_submit_task_use_case(session)

    try:
        outcome = use_case.execute(current_user.tenant_id, int(current_user.id or 0), payload.code, idempotency_key)
    except (
        TaskSubmitValidationError,
        TaskSubmitDependencyUnavailableError,
        TaskSubmitOverloadedError,
        TaskSubmitQueuePublishError,
    ) as exc:
        _raise_submit_error(exc)

    return TaskSubmitResponse(
        task_id=outcome.task_id,
        status=outcome.status,
        task_type=outcome.task_type,
        deduplicated=outcome.deduplicated,
    )


@router.post("/circuit/submit", response_model=TaskSubmitResponse)
def submit_circuit_task(
    payload: CircuitTaskSubmitRequest,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskSubmitResponse:
    use_case = build_submit_circuit_task_use_case(session)

    try:
        outcome = use_case.execute(
            current_user.tenant_id,
            int(current_user.id or 0),
            payload.model_dump(),
            idempotency_key,
        )
    except (
        TaskSubmitValidationError,
        TaskSubmitDependencyUnavailableError,
        TaskSubmitOverloadedError,
        TaskSubmitQueuePublishError,
    ) as exc:
        _raise_submit_error(exc)

    return TaskSubmitResponse(
        task_id=outcome.task_id,
        status=outcome.status,
        task_type=outcome.task_type,
        deduplicated=outcome.deduplicated,
    )


@router.post("/hybrid/submit", response_model=TaskSubmitResponse)
def submit_hybrid_task(
    payload: HybridTaskSubmitRequest,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskSubmitResponse:
    use_case = build_submit_hybrid_task_use_case(session)

    try:
        outcome = use_case.execute(
            current_user.tenant_id,
            int(current_user.id or 0),
            payload.model_dump(),
            idempotency_key,
        )
    except (
        TaskSubmitValidationError,
        TaskSubmitDependencyUnavailableError,
        TaskSubmitOverloadedError,
        TaskSubmitQueuePublishError,
    ) as exc:
        _raise_submit_error(exc)

    return TaskSubmitResponse(
        task_id=outcome.task_id,
        status=outcome.status,
        task_type=outcome.task_type,
        deduplicated=outcome.deduplicated,
    )


@router.get("/{task_id}", response_model=TaskStatusResponse)
def get_task_status(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskStatusResponse:
    try:
        task = GetTaskStatusUseCase(TaskQueryService(session)).execute(current_user.tenant_id, int(current_user.id or 0), task_id)
    except (TaskNotFoundError, TaskAccessDeniedError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task not found") from exc
    return TaskStatusResponse(
        task_id=task.task_id,
        status=task.status,
        task_type=task.task_type,
        error_message=task.error_message,
    )


@router.get("/{task_id}/result", response_model=TaskResultResponse)
def get_task_result(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskResultResponse:
    try:
        task = GetTaskResultUseCase(TaskQueryService(session)).execute(current_user.tenant_id, int(current_user.id or 0), task_id)
    except (TaskNotFoundError, TaskAccessDeniedError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task not found") from exc

    return TaskResultResponse(
        task_id=task.task_id,
        status=task.status,
        task_type=task.task_type,
        result=task.result,
        message=task.message,
    )


@router.post("/{task_id}/cancel", response_model=TaskCancelResponse)
def cancel_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskCancelResponse:
    try:
        task = CancelTaskUseCase(TaskQueryService(session)).execute(
            current_user.tenant_id,
            int(current_user.id or 0),
            task_id,
        )
    except (TaskNotFoundError, TaskAccessDeniedError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task not found") from exc

    return TaskCancelResponse(task_id=task.task_id, status=task.status)
