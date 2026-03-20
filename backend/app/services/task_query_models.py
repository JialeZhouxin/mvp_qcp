from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class TaskDiagnosticView:
    code: str
    message: str
    phase: str
    summary: str | None
    suggestions: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class TaskListItemView:
    task_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    duration_ms: int | None
    attempt_count: int
    has_result: bool


@dataclass(frozen=True)
class TaskListView:
    items: list[TaskListItemView]
    total: int
    limit: int
    offset: int


@dataclass(frozen=True)
class TaskDetailView:
    task_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    duration_ms: int | None
    attempt_count: int
    result: dict[str, Any] | None
    diagnostic: TaskDiagnosticView | None
