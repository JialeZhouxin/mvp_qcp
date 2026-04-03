from __future__ import annotations

import json
import logging
from datetime import datetime
from time import sleep

from sqlmodel import Session, select

from app.core.config import settings
from app.db.session import engine
from app.models.task import Task, TaskStatus
from app.services.hybrid_vqe import HybridExecutionError, run_vqe_experiment
from app.services.idempotency_service import IdempotencyService
from app.services.retry_policy import RetryPolicy
from app.services.task_lifecycle import TaskLifecycleService
from app.worker.celery_app import celery_app
from app.worker.task_names import RUN_HYBRID_TASK_NAME

logger = logging.getLogger(__name__)


def _build_retry_policy() -> RetryPolicy:
    return RetryPolicy(
        max_retries=settings.task_max_retries,
        backoff_schedule=settings.retry_backoff_schedule,
    )


def _resolve_error_code(exc: Exception) -> str:
    if isinstance(exc, HybridExecutionError):
        return exc.code
    return "HYBRID_EXEC_ERROR"


def run_hybrid_task(task_id: int) -> dict:
    with Session(engine) as session:
        task = session.exec(select(Task).where(Task.id == task_id)).first()
        if task is None:
            logger.error("event=hybrid_task_not_found task_id=%s", task_id)
            raise ValueError(f"task not found: {task_id}")
        if task.payload_json is None:
            raise ValueError(f"hybrid payload missing for task: {task_id}")
        if task.status == TaskStatus.CANCELLED:
            return {"task_id": task_id, "status": TaskStatus.CANCELLED.value}

        payload = json.loads(task.payload_json)
        lifecycle = TaskLifecycleService(session)
        idempotency_service = IdempotencyService(session, settings.idempotency_ttl_hours)
        retry_policy = _build_retry_policy()

        while True:
            lifecycle.start_attempt(task, datetime.utcnow())
            try:
                def should_stop() -> bool:
                    session.refresh(task)
                    return task.status == TaskStatus.CANCELLED

                def on_iteration(_trace_item: dict[str, object], running_state: dict[str, object]) -> None:
                    lifecycle.mark_progress(task, {"hybrid": running_state}, datetime.utcnow())

                summary = run_vqe_experiment(
                    payload,
                    on_iteration=on_iteration,
                    should_stop=should_stop,
                )
                if summary.get("state") == "cancelled":
                    lifecycle.mark_cancelled(task, datetime.utcnow())
                    idempotency_service.refresh_terminal_ttl(task.id or 0, datetime.utcnow())
                    return {"task_id": task.id, "status": TaskStatus.CANCELLED.value}

                result = {"hybrid": summary, "task_id": task.id}
                lifecycle.mark_success(task, result, datetime.utcnow())
                idempotency_service.refresh_terminal_ttl(task.id or 0, datetime.utcnow())
                logger.info(
                    "event=hybrid_task_success task_id=%s attempt=%s duration_ms=%s",
                    task.id,
                    task.attempt_count,
                    task.duration_ms,
                )
                return result
            except Exception as exc:
                if retry_policy.can_retry(task.attempt_count, exc):
                    delay_seconds = retry_policy.next_backoff_seconds(task.attempt_count)
                    logger.warning(
                        "event=hybrid_task_retry task_id=%s attempt=%s delay_seconds=%s error=%s",
                        task.id,
                        task.attempt_count,
                        delay_seconds,
                        str(exc),
                    )
                    sleep(delay_seconds)
                    continue

                error_code = _resolve_error_code(exc)
                if retry_policy.is_retryable_error(exc):
                    lifecycle.mark_retry_exhausted(task, error_code, str(exc), datetime.utcnow())
                else:
                    lifecycle.mark_failure(task, error_code, str(exc), datetime.utcnow())
                idempotency_service.refresh_terminal_ttl(task.id or 0, datetime.utcnow())
                logger.error(
                    "event=hybrid_task_failure task_id=%s attempt=%s status=%s error_code=%s",
                    task.id,
                    task.attempt_count,
                    task.status.value,
                    error_code,
                )
                raise


@celery_app.task(name=RUN_HYBRID_TASK_NAME)
def run_hybrid_task_job(task_id: int) -> dict:
    return run_hybrid_task(task_id)
