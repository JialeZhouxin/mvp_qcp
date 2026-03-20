import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlmodel import Session, select

from app.api.auth import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.queue.rq_queue import get_task_queue
from app.schemas.task import TaskResultResponse, TaskStatusResponse, TaskSubmitRequest, TaskSubmitResponse
from app.services.task_submit_service import (
    TaskSubmitCommand,
    TaskSubmitConfig,
    TaskSubmitOverloadedError,
    TaskSubmitQueuePublishError,
    TaskSubmitService,
    TaskSubmitValidationError,
)
from app.worker.tasks import run_quantum_task

router = APIRouter(prefix="/api/tasks", tags=["tasks"])
logger = logging.getLogger(__name__)

def _parse_json_or_none(raw: str | None) -> Any | None:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw


def _load_user_task_or_404(session: Session, task_id: int, user_id: int, action: str) -> Task:
    task = session.exec(select(Task).where(Task.id == task_id)).first()
    if task is None:
        logger.info("event=%s_not_found task_id=%s user_id=%s", action, task_id, user_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task not found")
    if task.user_id != user_id:
        logger.warning("event=%s_forbidden task_id=%s owner_id=%s user_id=%s", action, task_id, task.user_id, user_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task not found")
    return task


@router.post("/submit", response_model=TaskSubmitResponse)
def submit_task(
    payload: TaskSubmitRequest,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskSubmitResponse:
    submit_service = TaskSubmitService(
        session=session,
        config=TaskSubmitConfig(
            idempotency_ttl_hours=settings.idempotency_ttl_hours,
            idempotency_cleanup_batch_size=settings.idempotency_cleanup_batch_size,
            rq_job_timeout_seconds=settings.rq_job_timeout_seconds,
        ),
        queue_getter=get_task_queue,
        worker_task=run_quantum_task,
    )
    command = TaskSubmitCommand(
        user_id=current_user.id,
        code=payload.code,
        raw_idempotency_key=idempotency_key,
    )

    try:
        outcome = submit_service.submit(command)
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

    return TaskSubmitResponse(task_id=outcome.task_id, status=outcome.status, deduplicated=outcome.deduplicated)


@router.get("/{task_id}", response_model=TaskStatusResponse)
def get_task_status(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskStatusResponse:
    task = _load_user_task_or_404(session, task_id, current_user.id, action="task_status")
    return TaskStatusResponse(
        task_id=task.id,
        status=task.status.value,
        error_message=_parse_json_or_none(task.error_message),
    )


@router.get("/{task_id}/result", response_model=TaskResultResponse)
def get_task_result(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskResultResponse:
    task = _load_user_task_or_404(session, task_id, current_user.id, action="task_result")

    message = None
    if task.status in {TaskStatus.PENDING, TaskStatus.RUNNING}:
        message = "task not finished"
    elif task.status in {TaskStatus.FAILURE, TaskStatus.TIMEOUT, TaskStatus.RETRY_EXHAUSTED}:
        message = "task failed"

    return TaskResultResponse(
        task_id=task.id,
        status=task.status.value,
        result=_parse_json_or_none(task.result_json),
        message=message,
    )
