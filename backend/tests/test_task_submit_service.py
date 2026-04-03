from datetime import datetime, timedelta
from typing import Any, Callable

import pytest
from sqlmodel import SQLModel, Session, create_engine, select

from app.models.idempotency_record import IdempotencyRecord
from app.models.tenant import Tenant
from app.models.task import Task, TaskStatus, TaskType
from app.services.backpressure_service import QueueOverloadedError
from app.services.idempotency_service import IdempotencyService
from app.services.task_submit_dispatch_preflight import TaskDispatchPreflight
from app.services.task_submit_dispatch_service import TaskDispatchService
from app.services.task_submit_idempotency import TaskSubmitIdempotencyCoordinator
from app.services.task_submit_service import (
    TaskSubmitService,
)
from app.services.task_submit_shared import (
    TaskSubmitCommand,
    TaskSubmitConfig,
    TaskSubmitOverloadedError,
    TaskSubmitQueuePublishError,
    TaskSubmitValidationError,
)
from app.services.task_submit_validator import TaskSubmitValidator
from app.worker.tasks import RUN_QUANTUM_TASK_NAME


class QueueRecorder:
    def __init__(self, should_fail: bool = False) -> None:
        self.should_fail = should_fail
        self.calls: list[tuple[str, int, int]] = []

    def enqueue(self, task_name: str, task_id: int, job_timeout: int) -> None:
        if self.should_fail:
            raise RuntimeError("redis unavailable")
        self.calls.append((task_name, task_id, job_timeout))


class BackpressureStub:
    def __init__(self, depth: int = 0, error: QueueOverloadedError | None = None) -> None:
        self.depth = depth
        self.error = error

    def ensure_submit_capacity(self) -> int:
        if self.error is not None:
            raise self.error
        return self.depth


class FakeClock:
    def __init__(self, *values: datetime) -> None:
        self._values = list(values)
        self._index = 0

    def __call__(self) -> datetime:
        if self._index < len(self._values):
            value = self._values[self._index]
            self._index += 1
            return value
        return self._values[-1]


def _create_tenant(session: Session, slug: str = "submit-tenant") -> int:
    tenant = Tenant(slug=slug, name=f"{slug} workspace")
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return int(tenant.id or 0)


@pytest.fixture()
def session() -> Session:
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as db_session:
        yield db_session


def _build_submit_service(
    session: Session,
    *,
    queue: QueueRecorder,
    backpressure: BackpressureStub,
    now_provider: Callable[[], datetime] = datetime.utcnow,
) -> TaskSubmitService:
    return TaskSubmitService(
        session=session,
        validator=TaskSubmitValidator(),
        idempotency=TaskSubmitIdempotencyCoordinator(
            session,
            TaskSubmitConfig(
                idempotency_ttl_hours=24,
                idempotency_cleanup_batch_size=200,
                task_job_timeout_seconds=90,
            ),
        ),
        preflight=TaskDispatchPreflight(lambda: backpressure),
        dispatch=TaskDispatchService(
            session=session,
            config=TaskSubmitConfig(
                idempotency_ttl_hours=24,
                idempotency_cleanup_batch_size=200,
                task_job_timeout_seconds=90,
            ),
            queue_getter=lambda: queue,
            worker_task_name=RUN_QUANTUM_TASK_NAME,
            now_provider=now_provider,
        ),
        now_provider=now_provider,
    )


def _create_task(
    session: Session,
    tenant_id: int,
    user_id: int,
    code: str,
    status: TaskStatus = TaskStatus.PENDING,
) -> Task:
    task = Task(tenant_id=tenant_id, user_id=user_id, code=code, status=status)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@pytest.mark.parametrize(
    ("raw_key", "expected_message"),
    [
        ("   ", "idempotency key is empty"),
        ("x" * 256, "idempotency key is too long"),
    ],
)
def test_submit_rejects_invalid_idempotency_key(
    session: Session,
    raw_key: str,
    expected_message: str,
) -> None:
    queue = QueueRecorder()
    backpressure = BackpressureStub(depth=0)
    service = _build_submit_service(session, queue=queue, backpressure=backpressure)
    tenant_id = _create_tenant(session, slug="invalid-key-tenant")

    with pytest.raises(TaskSubmitValidationError) as exc_info:
        service.submit(
            TaskSubmitCommand(
                tenant_id=tenant_id,
                user_id=1,
                task_type=TaskType.CODE,
                code="def main():\n    return 1",
                raw_idempotency_key=raw_key,
            )
        )

    assert exc_info.value.code == "INVALID_IDEMPOTENCY_KEY"
    assert exc_info.value.message == expected_message
    assert queue.calls == []


def test_submit_returns_deduplicated_task_without_enqueue(session: Session) -> None:
    queue = QueueRecorder()
    backpressure = BackpressureStub(depth=0)
    now = datetime.utcnow()
    service = _build_submit_service(session, queue=queue, backpressure=backpressure)
    tenant_id = _create_tenant(session, slug="dedupe-tenant")

    existing_task = _create_task(
        session,
        tenant_id=tenant_id,
        user_id=1,
        code="def main():\n    return {'counts': {'00': 1}}",
    )
    idempotency = IdempotencyService(session, ttl_hours=24)
    idempotency.bind_task_key(tenant_id=tenant_id, user_id=1, key="same-key", task_id=existing_task.id, now=now)

    outcome = service.submit(
        TaskSubmitCommand(
                tenant_id=tenant_id,
                user_id=1,
                task_type=TaskType.CODE,
                code="def main():\n    return {'counts': {'11': 1}}",
                raw_idempotency_key="same-key",
            )
    )

    assert outcome.task_id == existing_task.id
    assert outcome.status == existing_task.status.value
    assert outcome.task_type == "code"
    assert outcome.deduplicated is True
    assert queue.calls == []


def test_submit_raises_overloaded_error_before_task_creation(session: Session) -> None:
    queue = QueueRecorder()
    overloaded = QueueOverloadedError(depth=201, threshold=200)
    backpressure = BackpressureStub(error=overloaded)
    service = _build_submit_service(session, queue=queue, backpressure=backpressure)
    tenant_id = _create_tenant(session, slug="overload-tenant")

    with pytest.raises(TaskSubmitOverloadedError) as exc_info:
        service.submit(
            TaskSubmitCommand(
                tenant_id=tenant_id,
                user_id=1,
                task_type=TaskType.CODE,
                code="def main():\n    return 1",
            )
        )

    assert exc_info.value.code == "QUEUE_OVERLOADED"
    assert exc_info.value.depth == 201
    assert exc_info.value.threshold == 200
    assert session.exec(select(Task)).all() == []


def test_submit_marks_failure_and_refreshes_idempotency_on_enqueue_failure(session: Session) -> None:
    queue = QueueRecorder(should_fail=True)
    backpressure = BackpressureStub(depth=3)
    start_time = datetime.utcnow()
    failure_time = start_time + timedelta(seconds=5)
    clock = FakeClock(start_time, failure_time)
    service = _build_submit_service(session, queue=queue, backpressure=backpressure, now_provider=clock)
    tenant_id = _create_tenant(session, slug="enqueue-failure-tenant")

    with pytest.raises(TaskSubmitQueuePublishError) as exc_info:
        service.submit(
            TaskSubmitCommand(
                tenant_id=tenant_id,
                user_id=1,
                task_type=TaskType.CODE,
                code="def main():\n    return {'counts': {'00': 1}}",
                raw_idempotency_key="enqueue-fail-key",
            )
        )

    assert exc_info.value.code == "QUEUE_PUBLISH_ERROR"
    task = session.exec(select(Task).where(Task.code.contains("counts"))).first()
    assert task is not None
    assert task.status == TaskStatus.FAILURE
    assert task.error_message is not None
    assert "QUEUE_PUBLISH_ERROR" in task.error_message

    record = session.exec(
        select(IdempotencyRecord).where(
            IdempotencyRecord.tenant_id == tenant_id,
            IdempotencyRecord.user_id == 1,
            IdempotencyRecord.idempotency_key == "enqueue-fail-key",
        )
    ).first()
    assert record is not None
    assert record.updated_at == failure_time


def test_submit_enqueues_pending_task_successfully(session: Session) -> None:
    queue = QueueRecorder()
    backpressure = BackpressureStub(depth=7)
    service = _build_submit_service(session, queue=queue, backpressure=backpressure)
    tenant_id = _create_tenant(session, slug="enqueue-success-tenant")

    outcome = service.submit(
            TaskSubmitCommand(
                tenant_id=tenant_id,
                user_id=1,
                task_type=TaskType.CODE,
                code="def main():\n    return {'counts': {'00': 3, '11': 1}}",
            )
        )

    assert outcome.deduplicated is False
    assert outcome.status == "PENDING"
    assert outcome.task_type == "code"
    assert outcome.queue_depth == 7
    assert len(queue.calls) == 1
    task_name, task_id, job_timeout = queue.calls[0]
    assert task_name == RUN_QUANTUM_TASK_NAME
    assert task_id == outcome.task_id
    assert job_timeout == 90

    task = session.exec(select(Task).where(Task.id == outcome.task_id)).first()
    assert task is not None
    assert task.status == TaskStatus.PENDING
    assert task.task_type == TaskType.CODE


def test_submit_persists_circuit_payload_without_code(session: Session) -> None:
    queue = QueueRecorder()
    backpressure = BackpressureStub(depth=2)
    service = _build_submit_service(session, queue=queue, backpressure=backpressure)
    tenant_id = _create_tenant(session, slug="circuit-submit-tenant")
    payload_json = '{"num_qubits":2,"operations":[{"gate":"h","targets":[0]}]}'

    outcome = service.submit(
        TaskSubmitCommand(
            tenant_id=tenant_id,
            user_id=1,
            task_type=TaskType.CIRCUIT,
            payload_json=payload_json,
        )
    )

    assert outcome.status == "PENDING"
    assert outcome.task_type == "circuit"
    task = session.exec(select(Task).where(Task.id == outcome.task_id)).first()
    assert task is not None
    assert task.task_type == TaskType.CIRCUIT
    assert task.code is None
    assert task.payload_json == payload_json


def test_submit_persists_hybrid_payload_without_code(session: Session) -> None:
    queue = QueueRecorder()
    backpressure = BackpressureStub(depth=4)
    service = _build_submit_service(session, queue=queue, backpressure=backpressure)
    tenant_id = _create_tenant(session, slug="hybrid-submit-tenant")
    payload_json = (
        '{"algorithm":"vqe","problem_template":"bell_state_overlap","max_iterations":20,'
        '"step_size":0.2,"target_bitstring":"00"}'
    )

    outcome = service.submit(
        TaskSubmitCommand(
            tenant_id=tenant_id,
            user_id=1,
            task_type=TaskType.HYBRID,
            payload_json=payload_json,
        )
    )

    assert outcome.status == "PENDING"
    assert outcome.task_type == "hybrid"
    task = session.exec(select(Task).where(Task.id == outcome.task_id)).first()
    assert task is not None
    assert task.task_type == TaskType.HYBRID
    assert task.code is None
    assert task.payload_json == payload_json
