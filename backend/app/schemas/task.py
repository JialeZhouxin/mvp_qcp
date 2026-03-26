from typing import Any

from pydantic import BaseModel, Field


class TaskSubmitRequest(BaseModel):
    code: str = Field(min_length=1, max_length=20000)


class CircuitTaskOperationRequest(BaseModel):
    gate: str = Field(min_length=1, max_length=16)
    targets: list[int] = Field(min_length=1, max_length=2)
    controls: list[int] | None = Field(default=None, max_length=2)
    params: list[float] | None = Field(default=None, max_length=3)


class CircuitTaskSubmitRequest(BaseModel):
    num_qubits: int = Field(ge=1, le=32)
    operations: list[CircuitTaskOperationRequest] = Field(default_factory=list, max_length=512)


class TaskSubmitResponse(BaseModel):
    task_id: int
    status: str
    task_type: str
    deduplicated: bool = False


class TaskStatusResponse(BaseModel):
    task_id: int
    status: str
    task_type: str
    error_message: Any | None = None


class TaskResultResponse(BaseModel):
    task_id: int
    status: str
    task_type: str
    result: dict[str, Any] | None = None
    message: str | None = None
