import json
import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.auth import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.queue.rq_queue import get_task_queue
from app.schemas.task import TaskResultResponse, TaskStatusResponse, TaskSubmitRequest, TaskSubmitResponse
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


@router.post("/submit", response_model=TaskSubmitResponse)
def submit_task(
    payload: TaskSubmitRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskSubmitResponse:
    task = Task(user_id=current_user.id, code=payload.code, status=TaskStatus.PENDING)
    session.add(task)
    session.commit()
    session.refresh(task)

    try:
        queue = get_task_queue()
        queue.enqueue(run_quantum_task, task.id, job_timeout=settings.rq_job_timeout_seconds)
    except Exception as exc:
        task.status = TaskStatus.FAILURE
        task.updated_at = datetime.utcnow()
        task.error_message = json.dumps({"code": "QUEUE_PUBLISH_ERROR", "message": str(exc)}, ensure_ascii=False)
        session.add(task)
        session.commit()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="任务入队失败") from exc

    return TaskSubmitResponse(task_id=task.id, status=task.status.value)


@router.get("/{task_id}", response_model=TaskStatusResponse)
def get_task_status(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TaskStatusResponse:
    task = session.exec(select(Task).where(Task.id == task_id)).first()
    if not task:
        logger.info("task status not found: task_id=%s user_id=%s", task_id, current_user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在")
    if task.user_id != current_user.id:
        logger.warning("task status forbidden: task_id=%s owner_id=%s user_id=%s", task_id, task.user_id, current_user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在")

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
    task = session.exec(select(Task).where(Task.id == task_id)).first()
    if not task:
        logger.info("task result not found: task_id=%s user_id=%s", task_id, current_user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在")
    if task.user_id != current_user.id:
        logger.warning("task result forbidden: task_id=%s owner_id=%s user_id=%s", task_id, task.user_id, current_user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在")

    message = None
    if task.status in {TaskStatus.PENDING, TaskStatus.RUNNING}:
        message = "task not finished"
    elif task.status == TaskStatus.FAILURE:
        message = "task failed"

    return TaskResultResponse(
        task_id=task.id,
        status=task.status.value,
        result=_parse_json_or_none(task.result_json),
        message=message,
    )
