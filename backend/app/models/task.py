from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    TIMEOUT = "TIMEOUT"
    RETRY_EXHAUSTED = "RETRY_EXHAUSTED"


class TaskType(str, Enum):
    CODE = "code"
    CIRCUIT = "circuit"


class Task(SQLModel, table=True):
    __table_args__ = (
        Index("ix_task_tenant_user_created_at", "tenant_id", "user_id", "created_at"),
        Index("ix_task_tenant_status_created_at", "tenant_id", "status", "created_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(index=True, foreign_key="tenant.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    task_type: TaskType = Field(default=TaskType.CODE, index=True)
    code: Optional[str] = Field(default=None)
    payload_json: Optional[str] = Field(default=None)
    status: TaskStatus = Field(default=TaskStatus.PENDING, index=True)
    result_json: Optional[str] = Field(default=None)
    error_message: Optional[str] = Field(default=None)
    attempt_count: int = Field(default=0)
    started_at: Optional[datetime] = Field(default=None)
    finished_at: Optional[datetime] = Field(default=None)
    duration_ms: Optional[int] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
