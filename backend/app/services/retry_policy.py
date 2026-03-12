from app.services.execution.base import ExecutionBackendError

NON_RETRYABLE_BACKEND_CODES = frozenset(
    {
        "SANDBOX_VALIDATION_ERROR",
        "INVALID_EXEC_OUTPUT",
        "INVALID_EXEC_RESULT",
        "EXECUTION_TIMEOUT",
    }
)


class RetryPolicy:
    def __init__(self, max_retries: int, backoff_schedule: list[int]) -> None:
        if max_retries < 0:
            raise ValueError("max_retries must be >= 0")
        if not backoff_schedule:
            raise ValueError("backoff_schedule must not be empty")
        self.max_retries = max_retries
        self.backoff_schedule = backoff_schedule

    def is_retryable_error(self, exc: Exception) -> bool:
        if isinstance(exc, TimeoutError):
            return False
        if isinstance(exc, ExecutionBackendError):
            return exc.code not in NON_RETRYABLE_BACKEND_CODES
        return True

    def can_retry(self, attempt_count: int, exc: Exception) -> bool:
        if not self.is_retryable_error(exc):
            return False
        return attempt_count <= self.max_retries

    def next_backoff_seconds(self, attempt_count: int) -> int:
        if attempt_count <= 0:
            raise ValueError("attempt_count must be positive")
        index = min(attempt_count - 1, len(self.backoff_schedule) - 1)
        return self.backoff_schedule[index]
