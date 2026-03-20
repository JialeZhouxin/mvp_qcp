import logging
from dataclasses import dataclass
from datetime import datetime

from sqlmodel import Session

from app.models.task import Task, TaskStatus
from app.services.backpressure_service import BackpressureService, QueueOverloadedError
from app.services.idempotency_cleanup import cleanup_expired_idempotency_records
from app.services.idempotency_service import IdempotencyService
from app.services.task_lifecycle import TaskLifecycleService
from app.services.task_submit_ports import BackpressureFactory, NowProvider, QueueGetter, WorkerTask

logger = logging.getLogger(__name__)

IDEMPOTENCY_KEY_MAX_LENGTH = 255
QUEUE_PUBLISH_ERROR_CODE = "QUEUE_PUBLISH_ERROR"

@dataclass(frozen=True)
class TaskSubmitConfig:
    idempotency_ttl_hours: int
    idempotency_cleanup_batch_size: int
    rq_job_timeout_seconds: int


@dataclass(frozen=True)
class TaskSubmitCommand:
    user_id: int
    code: str
    raw_idempotency_key: str | None = None


@dataclass(frozen=True)
class TaskSubmitOutcome:
    task_id: int
    status: str
    deduplicated: bool
    queue_depth: int | None


class TaskSubmitError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class TaskSubmitValidationError(TaskSubmitError):
    pass


class TaskSubmitOverloadedError(TaskSubmitError):
    def __init__(self, code: str, depth: int, threshold: int) -> None:
        super().__init__(code=code, message="task queue overloaded")
        self.depth = depth
        self.threshold = threshold


class TaskSubmitQueuePublishError(TaskSubmitError):
    pass


class TaskSubmitService:
    def __init__(
        self,
        session: Session,
        config: TaskSubmitConfig,
        queue_getter: QueueGetter,
        worker_task: WorkerTask,
        backpressure_factory: BackpressureFactory = BackpressureService.from_settings,
        now_provider: NowProvider = datetime.utcnow,
    ) -> None:
        self._session = session
        self._config = config
        self._queue_getter = queue_getter
        self._worker_task = worker_task
        self._backpressure_factory = backpressure_factory
        self._now_provider = now_provider

    def submit(self, command: TaskSubmitCommand) -> TaskSubmitOutcome:
        normalized_key = self._normalize_idempotency_key(command.raw_idempotency_key)
        now = self._now_provider()
        cleanup_expired_idempotency_records(
            self._session,
            now,
            self._config.idempotency_cleanup_batch_size,
        )

        idempotency_service = IdempotencyService(self._session, self._config.idempotency_ttl_hours)
        if normalized_key is not None:
            existing_task = idempotency_service.resolve_existing_task(command.user_id, normalized_key, now)
            if existing_task is not None:
                task_id = self._require_task_id(existing_task)
                logger.info(
                    "event=task_submit_deduplicated task_id=%s user_id=%s status=%s",
                    task_id,
                    command.user_id,
                    existing_task.status.value,
                )
                return TaskSubmitOutcome(
                    task_id=task_id,
                    status=existing_task.status.value,
                    deduplicated=True,
                    queue_depth=None,
                )

        queue_depth = self._ensure_submit_capacity(command.user_id)
        task = self._create_pending_task(command.user_id, command.code)
        task_id = self._require_task_id(task)

        if normalized_key is not None:
            idempotency_service.bind_task_key(command.user_id, normalized_key, task_id, now)

        self._enqueue_or_raise(task, task_id, command.user_id, normalized_key, idempotency_service)

        logger.info(
            "event=task_enqueued task_id=%s user_id=%s status=%s queue_depth=%s",
            task_id,
            command.user_id,
            task.status.value,
            queue_depth,
        )
        return TaskSubmitOutcome(
            task_id=task_id,
            status=task.status.value,
            deduplicated=False,
            queue_depth=queue_depth,
        )

    def _normalize_idempotency_key(self, raw_key: str | None) -> str | None:
        if raw_key is None:
            return None
        key = raw_key.strip()
        if not key:
            raise TaskSubmitValidationError(
                code="INVALID_IDEMPOTENCY_KEY",
                message="idempotency key is empty",
            )
        if len(key) > IDEMPOTENCY_KEY_MAX_LENGTH:
            raise TaskSubmitValidationError(
                code="INVALID_IDEMPOTENCY_KEY",
                message="idempotency key is too long",
            )
        return key

    def _ensure_submit_capacity(self, user_id: int) -> int:
        backpressure = self._backpressure_factory()
        try:
            return backpressure.ensure_submit_capacity()
        except QueueOverloadedError as exc:
            logger.warning(
                "event=task_submit_overloaded user_id=%s queue_depth=%s queue_threshold=%s",
                user_id,
                exc.depth,
                exc.threshold,
            )
            raise TaskSubmitOverloadedError(code=exc.code, depth=exc.depth, threshold=exc.threshold) from exc

    def _create_pending_task(self, user_id: int, code: str) -> Task:
        task = Task(user_id=user_id, code=code, status=TaskStatus.PENDING)
        self._session.add(task)
        self._session.commit()
        self._session.refresh(task)
        return task

    def _enqueue_or_raise(
        self,
        task: Task,
        task_id: int,
        user_id: int,
        normalized_key: str | None,
        idempotency_service: IdempotencyService,
    ) -> None:
        try:
            queue = self._queue_getter()
            queue.enqueue(self._worker_task, task_id, job_timeout=self._config.rq_job_timeout_seconds)
        except Exception as exc:
            lifecycle = TaskLifecycleService(self._session)
            failed_at = self._now_provider()
            lifecycle.mark_failure(task, QUEUE_PUBLISH_ERROR_CODE, str(exc), failed_at)
            if normalized_key is not None:
                idempotency_service.refresh_terminal_ttl(task_id, failed_at)
            logger.exception("event=task_enqueue_failed task_id=%s user_id=%s", task_id, user_id)
            raise TaskSubmitQueuePublishError(
                code=QUEUE_PUBLISH_ERROR_CODE,
                message="task enqueue failed",
            ) from exc

    def _require_task_id(self, task: Task) -> int:
        if task.id is None:
            raise RuntimeError("task id missing after persistence")
        return task.id
