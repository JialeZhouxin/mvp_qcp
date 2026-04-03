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


class HybridTaskSubmitRequest(BaseModel):
    algorithm: str = Field(min_length=1, max_length=32)
    problem_template: str = Field(min_length=1, max_length=64)
    max_iterations: int = Field(ge=1, le=10000, default=20)
    step_size: float = Field(gt=0, le=2, default=0.2)
    tolerance: float = Field(gt=0, le=1, default=1e-3)
    target_bitstring: str = Field(min_length=1, max_length=8, default="00")
    num_qubits: int = Field(ge=1, le=8, default=2)


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


class TaskCancelResponse(BaseModel):
    task_id: int
    status: str
