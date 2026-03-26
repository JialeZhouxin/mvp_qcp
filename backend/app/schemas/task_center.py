from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class TaskDiagnostic(BaseModel):
    code: str
    message: str
    phase: str = "EXECUTION"
    summary: str | None = None
    suggestions: list[str] = Field(default_factory=list)


class TaskCenterListItem(BaseModel):
    task_id: int
    status: str
    task_type: str
    created_at: datetime
    updated_at: datetime
    duration_ms: int | None = None
    attempt_count: int
    has_result: bool


class TaskCenterListResponse(BaseModel):
    items: list[TaskCenterListItem]
    total: int
    limit: int
    offset: int


class TaskCenterDetailResponse(BaseModel):
    task_id: int
    status: str
    task_type: str
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    duration_ms: int | None = None
    attempt_count: int
    result: dict[str, Any] | None = None
    diagnostic: TaskDiagnostic | None = None
