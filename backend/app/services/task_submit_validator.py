from app.services.task_submit_shared import IDEMPOTENCY_KEY_MAX_LENGTH, TaskSubmitValidationError


class TaskSubmitValidator:
    def normalize_idempotency_key(self, raw_key: str | None) -> str | None:
        if raw_key is None:
            return None
        key = raw_key.strip()
        if not key:
            raise TaskSubmitValidationError(
                code="INVALID_IDEMPOTENCY_KEY",
                message="idempotency key is empty",
            )
        if len(key) > IDEMPOTENCY_KEY_MAX_LENGTH:
            raise TaskSubmitValidationError(
                code="INVALID_IDEMPOTENCY_KEY",
                message="idempotency key is too long",
            )
        return key
