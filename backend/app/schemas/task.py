from typing import Any

from pydantic import BaseModel, Field


class TaskSubmitRequest(BaseModel):
    code: str = Field(min_length=1, max_length=20000)


class TaskSubmitResponse(BaseModel):
    task_id: int
    status: str


class TaskStatusResponse(BaseModel):
    task_id: int
    status: str
    error_message: Any | None = None


class TaskResultResponse(BaseModel):
    task_id: int
    status: str
    result: dict[str, Any] | None = None
    message: str | None = None
