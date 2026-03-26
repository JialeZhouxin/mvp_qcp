import json

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlmodel import Session

from app.api.auth import get_current_user
from app.dependencies.task_submit import build_submit_circuit_task_use_case, build_submit_task_use_case
from app.db.session import get_session
from app.models.user import User
from app.schemas.task import (
    CircuitTaskSubmitRequest,
    TaskResultResponse,
    TaskStatusResponse,
    TaskSubmitRequest,
    TaskSubmitResponse,
)
from app.services.circuit_executor_heartbeat import is_circuit_executor_available
from app.services.circuit_payload import CircuitPayloadValidationError, normalize_circuit_payload
from app.services.task_submit_shared import (
    TaskSubmitOverloadedError,
    TaskSubmitQueuePublishError,
    TaskSubmitValidationError,
)
from app.services.task_query_service import TaskQueryService
from app.use_cases.task_use_cases import (
    GetTaskResultUseCase,
    GetTaskStatusUseCase,
    TaskAccessDeniedError,
    TaskNotFoundError,
)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


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
    except TaskSubmitValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except TaskSubmitOverloadedError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": exc.code, "message": "task queue overloaded"},
        ) from exc
    except TaskSubmitQueuePublishError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": exc.code, "message": "task enqueue failed"},
        ) from exc

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
    if not is_circuit_executor_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "CIRCUIT_EXECUTOR_UNAVAILABLE", "message": "circuit executor unavailable"},
        )

    try:
        normalized_payload = normalize_circuit_payload(payload.model_dump())
    except CircuitPayloadValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    use_case = build_submit_circuit_task_use_case(session)

    try:
        outcome = use_case.execute(
            current_user.tenant_id,
            int(current_user.id or 0),
            json.dumps(normalized_payload, ensure_ascii=False, separators=(",", ":")),
            idempotency_key,
        )
    except TaskSubmitValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except TaskSubmitOverloadedError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": exc.code, "message": "task queue overloaded"},
        ) from exc
    except TaskSubmitQueuePublishError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": exc.code, "message": "task enqueue failed"},
        ) from exc

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
