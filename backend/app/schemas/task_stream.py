from datetime import datetime

from pydantic import BaseModel


class TaskStatusStreamEvent(BaseModel):
    task_id: int
    status: str
    updated_at: datetime
    duration_ms: int | None = None
    attempt_count: int


class TaskHeartbeatEvent(BaseModel):
    timestamp: datetime
