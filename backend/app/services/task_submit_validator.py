from app.models.task import TaskType
from app.services.task_submit_shared import IDEMPOTENCY_KEY_MAX_LENGTH, TaskSubmitCommand, TaskSubmitValidationError


class TaskSubmitValidator:
    def validate_command(self, command: TaskSubmitCommand) -> None:
        if command.task_type == TaskType.CODE:
            if command.code is None or not command.code.strip():
                raise TaskSubmitValidationError(
                    code="INVALID_TASK_CODE",
                    message="task code is empty",
                )
            return

        if command.task_type == TaskType.CIRCUIT:
            if command.payload_json is None or not command.payload_json.strip():
                raise TaskSubmitValidationError(
                    code="INVALID_CIRCUIT_PAYLOAD",
                    message="circuit payload is empty",
                )
            return

        if command.task_type == TaskType.HYBRID:
            if command.payload_json is None or not command.payload_json.strip():
                raise TaskSubmitValidationError(
                    code="INVALID_HYBRID_PAYLOAD",
                    message="hybrid payload is empty",
                )
            return

        raise TaskSubmitValidationError(
            code="INVALID_TASK_TYPE",
            message=f"unsupported task type: {command.task_type}",
        )

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
