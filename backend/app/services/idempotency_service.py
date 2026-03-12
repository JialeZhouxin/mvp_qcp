from datetime import datetime, timedelta

from sqlmodel import Session, select

from app.models.idempotency_record import IdempotencyRecord
from app.models.task import Task
from app.services.task_lifecycle import is_terminal_status


class IdempotencyService:
    def __init__(self, session: Session, ttl_hours: int) -> None:
        if ttl_hours <= 0:
            raise ValueError("idempotency ttl_hours must be positive")
        self._session = session
        self._ttl = timedelta(hours=ttl_hours)

    def resolve_existing_task(self, user_id: int, key: str, now: datetime | None = None) -> Task | None:
        current_time = now or datetime.utcnow()
        record = self._find_record(user_id=user_id, key=key)
        if record is None:
            return None

        task = self._session.exec(select(Task).where(Task.id == record.task_id)).first()
        if task is None:
            self._session.delete(record)
            self._session.commit()
            return None

        if not is_terminal_status(task.status):
            if record.expires_at is not None and record.expires_at <= current_time:
                record.expires_at = None
                record.updated_at = current_time
                self._persist(record)
            return task

        if record.expires_at is not None and record.expires_at <= current_time:
            self._session.delete(record)
            self._session.commit()
            return None
        return task

    def bind_task_key(
        self,
        user_id: int,
        key: str,
        task_id: int,
        now: datetime | None = None,
    ) -> IdempotencyRecord:
        current_time = now or datetime.utcnow()
        existing = self._find_record(user_id=user_id, key=key)
        if existing is not None and existing.task_id != task_id:
            raise ValueError(f"idempotency key already bound to another task: user_id={user_id}")
        if existing is not None:
            return existing

        record = IdempotencyRecord(
            user_id=user_id,
            idempotency_key=key,
            task_id=task_id,
            expires_at=current_time + self._ttl,
            created_at=current_time,
            updated_at=current_time,
        )
        self._persist(record)
        return record

    def refresh_terminal_ttl(self, task_id: int, now: datetime | None = None) -> int:
        current_time = now or datetime.utcnow()
        records = self._session.exec(select(IdempotencyRecord).where(IdempotencyRecord.task_id == task_id)).all()
        if not records:
            return 0

        expires_at = current_time + self._ttl
        for record in records:
            record.expires_at = expires_at
            record.updated_at = current_time
            self._session.add(record)
        self._session.commit()
        return len(records)

    def _find_record(self, user_id: int, key: str) -> IdempotencyRecord | None:
        query = select(IdempotencyRecord).where(IdempotencyRecord.user_id == user_id, IdempotencyRecord.idempotency_key == key)
        return self._session.exec(query).first()

    def _persist(self, record: IdempotencyRecord) -> None:
        self._session.add(record)
        self._session.commit()
        self._session.refresh(record)
