from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


ProjectEntryType = Literal["code", "circuit"]


class CodeProjectPayload(BaseModel):
    code: str = Field(min_length=1, max_length=20000)


class CircuitProjectPayload(BaseModel):
    circuit: dict[str, Any]
    qasm: str = Field(min_length=1, max_length=20000)
    display_mode: Literal["FILTERED", "ALL"]


class ProjectSaveRequest(BaseModel):
    entry_type: ProjectEntryType
    payload: dict[str, Any]
    last_task_id: int | None = None

    @model_validator(mode="after")
    def validate_payload_shape(self) -> "ProjectSaveRequest":
        if self.entry_type == "code":
            CodeProjectPayload.model_validate(self.payload)
            return self
        CircuitProjectPayload.model_validate(self.payload)
        return self


class ProjectItemResponse(BaseModel):
    id: int
    name: str
    entry_type: ProjectEntryType
    last_task_id: int | None = None
    updated_at: datetime


class ProjectDetailResponse(ProjectItemResponse):
    payload: dict[str, Any]


class ProjectListResponse(BaseModel):
    projects: list[ProjectItemResponse]
