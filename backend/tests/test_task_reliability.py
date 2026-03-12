from datetime import datetime, timedelta

import pytest
from sqlmodel import SQLModel, Session, create_engine, select

from app.models.idempotency_record import IdempotencyRecord
from app.models.task import Task, TaskStatus
from app.services.execution.base import ExecutionBackendError
from app.services.idempotency_service import IdempotencyService
from app.services.retry_policy import RetryPolicy
from app.services.task_lifecycle import TaskLifecycleService


@pytest.fixture()
def session() -> Session:
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as db_session:
        yield db_session


def _create_task(session: Session, status: TaskStatus = TaskStatus.PENDING) -> Task:
    task = Task(user_id=1, code="def main():\n    return {'counts': {'00': 1}}", status=status)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


def test_task_lifecycle_blocks_transition_after_terminal_state(session: Session) -> None:
    task = _create_task(session)
    lifecycle = TaskLifecycleService(session)

    lifecycle.start_attempt(task, datetime.utcnow())
    lifecycle.mark_success(task, {"counts": {"00": 1}}, datetime.utcnow())

    with pytest.raises(ValueError, match="cannot transition terminal task"):
        lifecycle.mark_failure(task, "WORKER_EXEC_ERROR", "should fail", datetime.utcnow())


def test_idempotency_service_keeps_non_terminal_binding_even_if_expired(session: Session) -> None:
    task = _create_task(session, status=TaskStatus.RUNNING)
    service = IdempotencyService(session, ttl_hours=24)
    now = datetime.utcnow()

    record = service.bind_task_key(user_id=task.user_id, key="same-key", task_id=task.id, now=now)
    record.expires_at = now - timedelta(seconds=1)
    record.updated_at = now
    session.add(record)
    session.commit()

    resolved = service.resolve_existing_task(task.user_id, "same-key", now)

    assert resolved is not None
    assert resolved.id == task.id
    refreshed = session.exec(select(IdempotencyRecord).where(IdempotencyRecord.id == record.id)).one()
    assert refreshed.expires_at is None


def test_idempotency_service_drops_expired_terminal_binding(session: Session) -> None:
    task = _create_task(session, status=TaskStatus.SUCCESS)
    service = IdempotencyService(session, ttl_hours=24)
    now = datetime.utcnow()

    record = service.bind_task_key(user_id=task.user_id, key="expired-key", task_id=task.id, now=now)
    record.expires_at = now - timedelta(seconds=1)
    record.updated_at = now
    session.add(record)
    session.commit()

    resolved = service.resolve_existing_task(task.user_id, "expired-key", now)

    assert resolved is None
    remaining = session.exec(select(IdempotencyRecord).where(IdempotencyRecord.id == record.id)).first()
    assert remaining is None


def test_retry_policy_classifies_errors_and_backoff() -> None:
    policy = RetryPolicy(max_retries=2, backoff_schedule=[1, 3])

    non_retryable = ExecutionBackendError("SANDBOX_VALIDATION_ERROR", "invalid")
    retryable = ExecutionBackendError("DOCKER_API_ERROR", "temporary")

    assert policy.is_retryable_error(non_retryable) is False
    assert policy.can_retry(1, non_retryable) is False
    assert policy.is_retryable_error(retryable) is True
    assert policy.can_retry(1, retryable) is True
    assert policy.can_retry(3, retryable) is False
    assert policy.next_backoff_seconds(1) == 1
    assert policy.next_backoff_seconds(2) == 3
