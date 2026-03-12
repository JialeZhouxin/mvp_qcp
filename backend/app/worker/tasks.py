import logging
from datetime import datetime
from time import sleep

from sqlmodel import Session, select

from app.core.config import settings
from app.db.session import engine
from app.models.task import Task
from app.services.execution.base import ExecutionBackendError
from app.services.idempotency_service import IdempotencyService
from app.services.qibo_executor import QiboExecutionError, execute_qibo_script
from app.services.retry_policy import RetryPolicy
from app.services.task_lifecycle import TaskLifecycleService

logger = logging.getLogger(__name__)


def _resolve_error_code(exc: Exception) -> str:
    if isinstance(exc, ExecutionBackendError):
        return exc.code
    if isinstance(exc, QiboExecutionError):
        return exc.code
    return "WORKER_EXEC_ERROR"


def _is_timeout_error(exc: Exception) -> bool:
    return isinstance(exc, ExecutionBackendError) and exc.code == "EXECUTION_TIMEOUT"


def _build_retry_policy() -> RetryPolicy:
    return RetryPolicy(
        max_retries=settings.task_max_retries,
        backoff_schedule=settings.retry_backoff_schedule,
    )


def _validate_timeout_invariant() -> None:
    if settings.rq_job_timeout_seconds <= settings.qibo_exec_timeout_seconds:
        raise ValueError("RQ_JOB_TIMEOUT_SECONDS must be greater than QIBO_EXEC_TIMEOUT_SECONDS")


def run_quantum_task(task_id: int) -> dict:
    _validate_timeout_invariant()
    with Session(engine) as session:
        task = session.exec(select(Task).where(Task.id == task_id)).first()
        if task is None:
            logger.error("event=task_not_found task_id=%s", task_id)
            raise ValueError(f"task not found: {task_id}")

        lifecycle = TaskLifecycleService(session)
        idempotency_service = IdempotencyService(session, settings.idempotency_ttl_hours)
        retry_policy = _build_retry_policy()

        while True:
            lifecycle.start_attempt(task, datetime.utcnow())
            try:
                result = execute_qibo_script(task.code)
                result["task_id"] = task.id
                lifecycle.mark_success(task, result, datetime.utcnow())
                idempotency_service.refresh_terminal_ttl(task.id, datetime.utcnow())
                logger.info(
                    "event=task_success task_id=%s attempt=%s duration_ms=%s",
                    task.id,
                    task.attempt_count,
                    task.duration_ms,
                )
                return result
            except Exception as exc:
                if _is_timeout_error(exc):
                    lifecycle.mark_timeout(task, str(exc), datetime.utcnow())
                    idempotency_service.refresh_terminal_ttl(task.id, datetime.utcnow())
                    logger.error("event=task_timeout task_id=%s attempt=%s", task.id, task.attempt_count)
                    raise

                if retry_policy.can_retry(task.attempt_count, exc):
                    delay_seconds = retry_policy.next_backoff_seconds(task.attempt_count)
                    logger.warning(
                        "event=task_retry task_id=%s attempt=%s delay_seconds=%s error=%s",
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
                idempotency_service.refresh_terminal_ttl(task.id, datetime.utcnow())
                logger.error(
                    "event=task_failure task_id=%s attempt=%s status=%s error_code=%s",
                    task.id,
                    task.attempt_count,
                    task.status.value,
                    error_code,
                )
                raise
