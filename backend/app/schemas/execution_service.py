from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ExecuteRequest(BaseModel):
    code: str = Field(min_length=1)
    timeout_seconds: int = Field(gt=0)


class ExecutionErrorPayload(BaseModel):
    code: str
    message: str


class ExecuteSuccessResponse(BaseModel):
    result: dict[str, Any] | list[Any] | str | int | float | bool | None


class ExecuteErrorResponse(BaseModel):
    error: ExecutionErrorPayload


class ExecutionHealthResponse(BaseModel):
    status: str
    backend: str
