from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlmodel import Session

from app.api.auth import get_current_user
from app.api.task_presenters import to_task_result_response, to_task_status_response, to_task_submit_response
from app.dependencies.task_submit import build_submit_task_use_case
from app.db.session import get_session
from app.models.user import User
from app.schemas.task import TaskResultResponse, TaskStatusResponse, TaskSubmitRequest, TaskSubmitResponse
from app.services.task_submit_shared import (
    TaskSubmitOverloadedError,
    TaskSubmitQueuePublishError,
    TaskSubmitValidationError,
)
from app.services.user_task_query_service import UserTaskQueryService
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
    """Submit a quantum task and enqueue it for async execution."""
    use_case = build_submit_task_use_case(session)

    try:
        outcome = use_case.execute(current_user.id, payload.code, idempotency_key)
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

    return to_task_submit_response(outcome)


@router.get("/{task_id}", response_model=TaskStatusResponse)
def get_task_status(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskStatusResponse:
    """Return current task status for the authenticated owner."""
    try:
        task = GetTaskStatusUseCase(UserTaskQueryService(session)).execute(current_user.id, task_id)
    except (TaskNotFoundError, TaskAccessDeniedError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task not found") from exc
    return to_task_status_response(task)


@router.get("/{task_id}/result", response_model=TaskResultResponse)
def get_task_result(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskResultResponse:
    """Return task result payload for the authenticated owner."""
    try:
        task = GetTaskResultUseCase(UserTaskQueryService(session)).execute(current_user.id, task_id)
    except (TaskNotFoundError, TaskAccessDeniedError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task not found") from exc

    return to_task_result_response(task)
