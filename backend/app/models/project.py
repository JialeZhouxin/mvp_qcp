from datetime import datetime
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Project(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("tenant_id", "user_id", "name", name="uq_project_tenant_user_name"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(index=True, foreign_key="tenant.id")
    user_id: int = Field(index=True, foreign_key="user.id")
    name: str = Field(min_length=1, max_length=80, index=True)
    entry_type: str = Field(min_length=1, max_length=16)
    payload_json: str
    last_task_id: Optional[int] = Field(default=None, foreign_key="task.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
