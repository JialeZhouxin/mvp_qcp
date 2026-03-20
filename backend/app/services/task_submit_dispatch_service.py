import logging

from sqlmodel import Session

from app.models.task import Task
from app.services.task_lifecycle import TaskLifecycleService
from app.services.task_submit_idempotency import TaskSubmitIdempotencyCoordinator
from app.services.task_submit_ports import NowProvider, QueueGetter, WorkerTask
from app.services.task_submit_shared import (
    QUEUE_PUBLISH_ERROR_CODE,
    TaskSubmitConfig,
    TaskSubmitQueuePublishError,
)

logger = logging.getLogger(__name__)


class TaskDispatchService:
    def __init__(
        self,
        session: Session,
        config: TaskSubmitConfig,
        queue_getter: QueueGetter,
        worker_task: WorkerTask,
        now_provider: NowProvider,
    ) -> None:
        self._session = session
        self._config = config
        self._queue_getter = queue_getter
        self._worker_task = worker_task
        self._now_provider = now_provider

    def dispatch(
        self,
        task: Task,
        task_id: int,
        user_id: int,
        normalized_key: str | None,
        idempotency: TaskSubmitIdempotencyCoordinator,
    ) -> None:
        try:
            queue = self._queue_getter()
            queue.enqueue(self._worker_task, task_id, job_timeout=self._config.rq_job_timeout_seconds)
        except Exception as exc:
            lifecycle = TaskLifecycleService(self._session)
            failed_at = self._now_provider()
            lifecycle.mark_failure(task, QUEUE_PUBLISH_ERROR_CODE, str(exc), failed_at)
            if normalized_key is not None:
                idempotency.refresh_terminal(task_id, failed_at)
            logger.exception("event=task_enqueue_failed task_id=%s user_id=%s", task_id, user_id)
            raise TaskSubmitQueuePublishError(
                code=QUEUE_PUBLISH_ERROR_CODE,
                message="task enqueue failed",
            ) from exc
