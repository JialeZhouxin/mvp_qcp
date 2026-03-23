from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class TaskStatusStreamPayload:
    task_id: int
    status: str
    updated_at: datetime
    duration_ms: int | None
    attempt_count: int


@dataclass(frozen=True)
class TaskHeartbeatPayload:
    timestamp: datetime
