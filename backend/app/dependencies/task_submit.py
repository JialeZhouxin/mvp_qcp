from datetime import datetime

from sqlmodel import Session

from app.core.config import settings
from app.queue.celery_queue import get_circuit_task_queue, get_hybrid_task_queue, get_task_queue
from app.services.backpressure_service import BackpressureService
from app.services.task_submit_dispatch_preflight import TaskDispatchPreflight
from app.services.task_submit_dispatch_service import TaskDispatchService
from app.services.task_submit_idempotency import TaskSubmitIdempotencyCoordinator
from app.services.task_submit_ports import BackpressureFactory, NowProvider, QueueGetter, WorkerTaskName
from app.services.task_submit_service import TaskSubmitService
from app.services.task_submit_shared import TaskSubmitConfig
from app.services.task_submit_validator import TaskSubmitValidator
from app.use_cases.task_use_cases import SubmitCircuitTaskUseCase, SubmitHybridTaskUseCase, SubmitTaskUseCase
from app.worker.task_names import RUN_CIRCUIT_TASK_NAME, RUN_HYBRID_TASK_NAME, RUN_QUANTUM_TASK_NAME


def _build_submit_service(
    session: Session,
    *,
    default_queue_getter: QueueGetter,
    default_worker_task_name: WorkerTaskName,
    default_backpressure_factory: BackpressureFactory,
    queue_getter: QueueGetter | None = None,
    worker_task_name: WorkerTaskName | None = None,
    backpressure_factory: BackpressureFactory | None = None,
    now_provider: NowProvider = datetime.utcnow,
) -> TaskSubmitService:
    config = TaskSubmitConfig(
        idempotency_ttl_hours=settings.idempotency_ttl_hours,
        idempotency_cleanup_batch_size=settings.idempotency_cleanup_batch_size,
        task_job_timeout_seconds=settings.task_job_timeout_seconds,
    )
    resolved_queue_getter = queue_getter or default_queue_getter
    resolved_worker_task_name = worker_task_name or default_worker_task_name
    resolved_backpressure_factory = backpressure_factory or default_backpressure_factory

    return TaskSubmitService(
        session=session,
        validator=TaskSubmitValidator(),
        idempotency=TaskSubmitIdempotencyCoordinator(session, config),
        preflight=TaskDispatchPreflight(resolved_backpressure_factory),
        dispatch=TaskDispatchService(
            session=session,
            config=config,
            queue_getter=resolved_queue_getter,
            worker_task_name=resolved_worker_task_name,
            now_provider=now_provider,
        ),
        now_provider=now_provider,
    )


def build_submit_task_service(
    session: Session,
    *,
    queue_getter: QueueGetter | None = None,
    worker_task_name: WorkerTaskName | None = None,
    backpressure_factory: BackpressureFactory | None = None,
    now_provider: NowProvider = datetime.utcnow,
) -> TaskSubmitService:
    return _build_submit_service(
        session=session,
        default_queue_getter=get_task_queue,
        default_worker_task_name=RUN_QUANTUM_TASK_NAME,
        default_backpressure_factory=BackpressureService.from_settings,
        queue_getter=queue_getter,
        worker_task_name=worker_task_name,
        backpressure_factory=backpressure_factory,
        now_provider=now_provider,
    )


def build_submit_task_use_case(
    session: Session,
    *,
    queue_getter: QueueGetter | None = None,
    worker_task_name: WorkerTaskName | None = None,
    backpressure_factory: BackpressureFactory | None = None,
    now_provider: NowProvider = datetime.utcnow,
) -> SubmitTaskUseCase:
    service = build_submit_task_service(
        session,
        queue_getter=queue_getter,
        worker_task_name=worker_task_name,
        backpressure_factory=backpressure_factory,
        now_provider=now_provider,
    )
    return SubmitTaskUseCase(service)


def build_submit_circuit_task_service(
    session: Session,
    *,
    queue_getter: QueueGetter | None = None,
    worker_task_name: WorkerTaskName | None = None,
    backpressure_factory: BackpressureFactory | None = None,
    now_provider: NowProvider = datetime.utcnow,
) -> TaskSubmitService:
    return _build_submit_service(
        session=session,
        default_queue_getter=get_circuit_task_queue,
        default_worker_task_name=RUN_CIRCUIT_TASK_NAME,
        default_backpressure_factory=(
            lambda: BackpressureService.from_settings(queue_name=settings.circuit_task_queue_name)
        ),
        queue_getter=queue_getter,
        worker_task_name=worker_task_name,
        backpressure_factory=backpressure_factory,
        now_provider=now_provider,
    )


def build_submit_circuit_task_use_case(
    session: Session,
    *,
    queue_getter: QueueGetter | None = None,
    worker_task_name: WorkerTaskName | None = None,
    backpressure_factory: BackpressureFactory | None = None,
    now_provider: NowProvider = datetime.utcnow,
) -> SubmitCircuitTaskUseCase:
    service = build_submit_circuit_task_service(
        session,
        queue_getter=queue_getter,
        worker_task_name=worker_task_name,
        backpressure_factory=backpressure_factory,
        now_provider=now_provider,
    )
    return SubmitCircuitTaskUseCase(service)


def build_submit_hybrid_task_service(
    session: Session,
    *,
    queue_getter: QueueGetter | None = None,
    worker_task_name: WorkerTaskName | None = None,
    backpressure_factory: BackpressureFactory | None = None,
    now_provider: NowProvider = datetime.utcnow,
) -> TaskSubmitService:
    return _build_submit_service(
        session=session,
        default_queue_getter=get_hybrid_task_queue,
        default_worker_task_name=RUN_HYBRID_TASK_NAME,
        default_backpressure_factory=(
            lambda: BackpressureService.from_settings(queue_name=settings.hybrid_task_queue_name)
        ),
        queue_getter=queue_getter,
        worker_task_name=worker_task_name,
        backpressure_factory=backpressure_factory,
        now_provider=now_provider,
    )


def build_submit_hybrid_task_use_case(
    session: Session,
    *,
    queue_getter: QueueGetter | None = None,
    worker_task_name: WorkerTaskName | None = None,
    backpressure_factory: BackpressureFactory | None = None,
    now_provider: NowProvider = datetime.utcnow,
) -> SubmitHybridTaskUseCase:
    service = build_submit_hybrid_task_service(
        session,
        queue_getter=queue_getter,
        worker_task_name=worker_task_name,
        backpressure_factory=backpressure_factory,
        now_provider=now_provider,
    )
    return SubmitHybridTaskUseCase(service)
