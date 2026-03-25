from datetime import datetime
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class IdempotencyRecord(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", "idempotency_key", name="uq_idempotency_tenant_user_key"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(index=True, foreign_key="tenant.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    idempotency_key: str = Field(index=True, max_length=255)
    task_id: int = Field(index=True, foreign_key="task.id")
    expires_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
