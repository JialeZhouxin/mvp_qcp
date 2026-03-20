import logging

from sqlmodel import Session

from app.models.task import Task, TaskStatus
from app.services.task_submit_dispatch_preflight import TaskDispatchPreflight
from app.services.task_submit_dispatch_service import TaskDispatchService
from app.services.task_submit_idempotency import TaskSubmitIdempotencyCoordinator
from app.services.task_submit_ports import NowProvider
from app.services.task_submit_shared import TaskSubmitCommand, TaskSubmitOutcome
from app.services.task_submit_validator import TaskSubmitValidator

logger = logging.getLogger(__name__)


class TaskSubmitService:
    def __init__(
        self,
        session: Session,
        validator: TaskSubmitValidator,
        idempotency: TaskSubmitIdempotencyCoordinator,
        preflight: TaskDispatchPreflight,
        dispatch: TaskDispatchService,
        now_provider: NowProvider,
    ) -> None:
        self._session = session
        self._validator = validator
        self._idempotency = idempotency
        self._preflight = preflight
        self._dispatch = dispatch
        self._now_provider = now_provider

    def submit(self, command: TaskSubmitCommand) -> TaskSubmitOutcome:
        normalized_key = self._validator.normalize_idempotency_key(command.raw_idempotency_key)
        now = self._now_provider()
        self._idempotency.cleanup_expired_records(now)
        if normalized_key is not None:
            existing_task = self._idempotency.resolve_existing(command.user_id, normalized_key, now)
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

        queue_depth = self._preflight.ensure_submit_capacity(command.user_id)
        task = self._create_pending_task(command.user_id, command.code)
        task_id = self._require_task_id(task)

        if normalized_key is not None:
            self._idempotency.bind(command.user_id, normalized_key, task_id, now)

        self._dispatch.dispatch(task, task_id, command.user_id, normalized_key, self._idempotency)

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

    def _create_pending_task(self, user_id: int, code: str) -> Task:
        task = Task(user_id=user_id, code=code, status=TaskStatus.PENDING)
        self._session.add(task)
        self._session.commit()
        self._session.refresh(task)
        return task

    def _require_task_id(self, task: Task) -> int:
        if task.id is None:
            raise RuntimeError("task id missing after persistence")
        return task.id
