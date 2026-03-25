from datetime import datetime

from sqlmodel import Session

from app.models.task import Task
from app.services.idempotency_cleanup import cleanup_expired_idempotency_records
from app.services.idempotency_service import IdempotencyService
from app.services.task_submit_shared import TaskSubmitConfig


class TaskSubmitIdempotencyCoordinator:
    def __init__(self, session: Session, config: TaskSubmitConfig) -> None:
        self._session = session
        self._config = config
        self._service = IdempotencyService(session, config.idempotency_ttl_hours)

    def cleanup_expired_records(self, now: datetime) -> None:
        cleanup_expired_idempotency_records(
            self._session,
            now,
            self._config.idempotency_cleanup_batch_size,
        )

    def resolve_existing(self, tenant_id: int, user_id: int, normalized_key: str, now: datetime) -> Task | None:
        return self._service.resolve_existing_task(tenant_id, user_id, normalized_key, now)

    def bind(self, tenant_id: int, user_id: int, normalized_key: str, task_id: int, now: datetime) -> None:
        self._service.bind_task_key(tenant_id, user_id, normalized_key, task_id, now)

    def refresh_terminal(self, task_id: int, failed_at: datetime) -> None:
        self._service.refresh_terminal_ttl(task_id, failed_at)
