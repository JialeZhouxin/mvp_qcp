from datetime import datetime

from sqlmodel import Session, select

from app.models.idempotency_record import IdempotencyRecord
from app.models.task import Task
from app.services.task_lifecycle import TERMINAL_TASK_STATUSES


def cleanup_expired_idempotency_records(session: Session, now: datetime, limit: int) -> int:
    if limit <= 0:
        raise ValueError("cleanup limit must be positive")

    query = (
        select(IdempotencyRecord)
        .join(Task, Task.id == IdempotencyRecord.task_id)
        .where(IdempotencyRecord.expires_at.is_not(None))
        .where(IdempotencyRecord.expires_at <= now)
        .where(Task.status.in_(tuple(TERMINAL_TASK_STATUSES)))
        .limit(limit)
    )
    records = session.exec(query).all()
    if not records:
        return 0

    for record in records:
        session.delete(record)
    session.commit()
    return len(records)
