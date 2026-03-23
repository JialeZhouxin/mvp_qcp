from pydantic import BaseModel, Field

TaskErrorMessagePayload = dict[str, object] | str
TaskResultPayload = dict[str, object]


class TaskSubmitRequest(BaseModel):
    code: str = Field(min_length=1, max_length=20000)


class TaskSubmitResponse(BaseModel):
    task_id: int
    status: str
    deduplicated: bool = False


class TaskStatusResponse(BaseModel):
    task_id: int
    status: str
    error_message: TaskErrorMessagePayload | None = None


class TaskResultResponse(BaseModel):
    task_id: int
    status: str
    result: TaskResultPayload | None = None
    message: str | None = None
