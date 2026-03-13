from typing import Any

from app.services.error_diagnostic_service import build_task_diagnostic


def build_error_payload(code: str, message: str) -> dict[str, Any]:
    return build_task_diagnostic(code, message)
