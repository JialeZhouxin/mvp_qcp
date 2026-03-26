from __future__ import annotations

import json
import logging
from datetime import datetime
from time import sleep

from celery.signals import worker_ready, worker_shutdown
from sqlmodel import Session, select

from app.core.config import settings
from app.db.session import engine
from app.models.task import Task
from app.services.circuit_executor_heartbeat import CircuitExecutorHeartbeat
from app.services.circuit_hot_executor import CircuitHotExecutorError, get_circuit_executor_pool
from app.services.idempotency_service import IdempotencyService
from app.services.retry_policy import RetryPolicy
from app.services.task_lifecycle import TaskLifecycleService
from app.worker.celery_app import celery_app
from app.worker.task_names import RUN_CIRCUIT_TASK_NAME

logger = logging.getLogger(__name__)
_heartbeat = CircuitExecutorHeartbeat()


def _build_retry_policy() -> RetryPolicy:
    return RetryPolicy(
        max_retries=settings.task_max_retries,
        backoff_schedule=settings.retry_backoff_schedule,
    )


def _validate_timeout_invariant() -> None:
    if settings.task_job_timeout_seconds <= settings.circuit_exec_timeout_seconds:
        raise ValueError("TASK_JOB_TIMEOUT_SECONDS must be greater than CIRCUIT_EXEC_TIMEOUT_SECONDS")


def run_circuit_task(task_id: int) -> dict:
    _validate_timeout_invariant()
    with Session(engine) as session:
        task = session.exec(select(Task).where(Task.id == task_id)).first()
        if task is None:
            logger.error("event=circuit_task_not_found task_id=%s", task_id)
            raise ValueError(f"task not found: {task_id}")
        if task.payload_json is None:
            raise ValueError(f"circuit payload missing for task: {task_id}")

        payload = json.loads(task.payload_json)
        lifecycle = TaskLifecycleService(session)
        idempotency_service = IdempotencyService(session, settings.idempotency_ttl_hours)
        retry_policy = _build_retry_policy()
        pool = get_circuit_executor_pool()

        while True:
            lifecycle.start_attempt(task, datetime.utcnow())
            try:
                result = pool.execute(payload, timeout_seconds=settings.circuit_exec_timeout_seconds)
                result["task_id"] = task.id
                lifecycle.mark_success(task, result, datetime.utcnow())
                idempotency_service.refresh_terminal_ttl(task.id, datetime.utcnow())
                logger.info(
                    "event=circuit_task_success task_id=%s attempt=%s duration_ms=%s",
                    task.id,
                    task.attempt_count,
                    task.duration_ms,
                )
                return result
            except Exception as exc:
                if isinstance(exc, CircuitHotExecutorError) and exc.code == "CIRCUIT_EXEC_TIMEOUT":
                    lifecycle.mark_timeout(task, str(exc), datetime.utcnow())
                    idempotency_service.refresh_terminal_ttl(task.id, datetime.utcnow())
                    raise

                if retry_policy.can_retry(task.attempt_count, exc):
                    delay_seconds = retry_policy.next_backoff_seconds(task.attempt_count)
                    logger.warning(
                        "event=circuit_task_retry task_id=%s attempt=%s delay_seconds=%s error=%s",
                        task.id,
                        task.attempt_count,
                        delay_seconds,
                        str(exc),
                    )
                    sleep(delay_seconds)
                    continue

                error_code = getattr(exc, "code", "CIRCUIT_EXEC_ERROR")
                if retry_policy.is_retryable_error(exc):
                    lifecycle.mark_retry_exhausted(task, error_code, str(exc), datetime.utcnow())
                else:
                    lifecycle.mark_failure(task, error_code, str(exc), datetime.utcnow())
                idempotency_service.refresh_terminal_ttl(task.id, datetime.utcnow())
                raise


@worker_ready.connect
def warm_circuit_executor(**_kwargs) -> None:
    if settings.worker_role != "circuit":
        return
    pool = get_circuit_executor_pool()
    pool.start()
    _heartbeat.start()


@worker_shutdown.connect
def shutdown_circuit_executor(**_kwargs) -> None:
    if settings.worker_role != "circuit":
        return
    _heartbeat.stop()
    get_circuit_executor_pool().close()


@celery_app.task(name=RUN_CIRCUIT_TASK_NAME)
def run_circuit_task_job(task_id: int) -> dict:
    return run_circuit_task(task_id)
