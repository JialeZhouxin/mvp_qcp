from sqlmodel import Session

from app.core.config import settings
from app.queue.rq_queue import get_task_queue
from app.services.backpressure_service import BackpressureService
from app.services.task_submit_ports import BackpressureFactory, QueueGetter, WorkerTask
from app.services.task_submit_service import TaskSubmitConfig, TaskSubmitService
from app.use_cases.task_use_cases import SubmitTaskUseCase
from app.worker.tasks import run_quantum_task


def build_submit_task_service(
    session: Session,
    *,
    queue_getter: QueueGetter | None = None,
    worker_task: WorkerTask | None = None,
    backpressure_factory: BackpressureFactory | None = None,
) -> TaskSubmitService:
    resolved_queue_getter = queue_getter or get_task_queue
    resolved_worker_task = worker_task or run_quantum_task
    resolved_backpressure_factory = backpressure_factory or BackpressureService.from_settings

    return TaskSubmitService(
        session=session,
        config=TaskSubmitConfig(
            idempotency_ttl_hours=settings.idempotency_ttl_hours,
            idempotency_cleanup_batch_size=settings.idempotency_cleanup_batch_size,
            rq_job_timeout_seconds=settings.rq_job_timeout_seconds,
        ),
        queue_getter=resolved_queue_getter,
        worker_task=resolved_worker_task,
        backpressure_factory=resolved_backpressure_factory,
    )


def build_submit_task_use_case(
    session: Session,
    *,
    queue_getter: QueueGetter | None = None,
    worker_task: WorkerTask | None = None,
    backpressure_factory: BackpressureFactory | None = None,
) -> SubmitTaskUseCase:
    service = build_submit_task_service(
        session,
        queue_getter=queue_getter,
        worker_task=worker_task,
        backpressure_factory=backpressure_factory,
    )
    return SubmitTaskUseCase(service)
