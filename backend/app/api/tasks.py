import json
import logging
from datetime import datetime
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
from app.services.backpressure_service import BackpressureService, QueueOverloadedError
from app.services.idempotency_cleanup import cleanup_expired_idempotency_records
from app.services.idempotency_service import IdempotencyService
from app.services.task_lifecycle import TaskLifecycleService
from app.worker.tasks import run_quantum_task

router = APIRouter(prefix="/api/tasks", tags=["tasks"])
logger = logging.getLogger(__name__)

IDEMPOTENCY_KEY_MAX_LENGTH = 255


def _parse_json_or_none(raw: str | None) -> Any | None:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw


def _normalize_idempotency_key(raw_key: str | None) -> str | None:
    if raw_key is None:
        return None
    key = raw_key.strip()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_IDEMPOTENCY_KEY", "message": "idempotency key is empty"},
        )
    if len(key) > IDEMPOTENCY_KEY_MAX_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_IDEMPOTENCY_KEY", "message": "idempotency key is too long"},
        )
    return key


def _create_pending_task(session: Session, user_id: int, code: str) -> Task:
    task = Task(user_id=user_id, code=code, status=TaskStatus.PENDING)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


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
    normalized_key = _normalize_idempotency_key(idempotency_key)
    now = datetime.utcnow()
    cleanup_expired_idempotency_records(session, now, settings.idempotency_cleanup_batch_size)

    idempotency_service = IdempotencyService(session, settings.idempotency_ttl_hours)
    if normalized_key is not None:
        existing_task = idempotency_service.resolve_existing_task(current_user.id, normalized_key, now)
        if existing_task is not None:
            logger.info(
                "event=task_submit_deduplicated task_id=%s user_id=%s status=%s",
                existing_task.id,
                current_user.id,
                existing_task.status.value,
            )
            return TaskSubmitResponse(task_id=existing_task.id, status=existing_task.status.value, deduplicated=True)

    backpressure = BackpressureService.from_settings()
    try:
        queue_depth = backpressure.ensure_submit_capacity()
    except QueueOverloadedError as exc:
        logger.warning(
            "event=task_submit_overloaded user_id=%s queue_depth=%s queue_threshold=%s",
            current_user.id,
            exc.depth,
            exc.threshold,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": exc.code, "message": "task queue overloaded"},
        ) from exc

    task = _create_pending_task(session, current_user.id, payload.code)
    if normalized_key is not None:
        idempotency_service.bind_task_key(current_user.id, normalized_key, task.id, now)

    try:
        queue = get_task_queue()
        queue.enqueue(run_quantum_task, task.id, job_timeout=settings.rq_job_timeout_seconds)
    except Exception as exc:
        lifecycle = TaskLifecycleService(session)
        lifecycle.mark_failure(task, "QUEUE_PUBLISH_ERROR", str(exc), datetime.utcnow())
        if normalized_key is not None:
            idempotency_service.refresh_terminal_ttl(task.id, datetime.utcnow())
        logger.exception("event=task_enqueue_failed task_id=%s user_id=%s", task.id, current_user.id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "QUEUE_PUBLISH_ERROR", "message": "task enqueue failed"},
        ) from exc

    logger.info(
        "event=task_enqueued task_id=%s user_id=%s status=%s queue_depth=%s",
        task.id,
        current_user.id,
        task.status.value,
        queue_depth,
    )
    return TaskSubmitResponse(task_id=task.id, status=task.status.value, deduplicated=False)


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
