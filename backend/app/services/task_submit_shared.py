from dataclasses import dataclass


IDEMPOTENCY_KEY_MAX_LENGTH = 255
QUEUE_PUBLISH_ERROR_CODE = "QUEUE_PUBLISH_ERROR"


@dataclass(frozen=True)
class TaskSubmitConfig:
    idempotency_ttl_hours: int
    idempotency_cleanup_batch_size: int
    rq_job_timeout_seconds: int


@dataclass(frozen=True)
class TaskSubmitCommand:
    user_id: int
    code: str
    raw_idempotency_key: str | None = None


@dataclass(frozen=True)
class TaskSubmitOutcome:
    task_id: int
    status: str
    deduplicated: bool
    queue_depth: int | None


class TaskSubmitError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class TaskSubmitValidationError(TaskSubmitError):
    pass


class TaskSubmitOverloadedError(TaskSubmitError):
    def __init__(self, code: str, depth: int, threshold: int) -> None:
        super().__init__(code=code, message="task queue overloaded")
        self.depth = depth
        self.threshold = threshold


class TaskSubmitQueuePublishError(TaskSubmitError):
    pass
