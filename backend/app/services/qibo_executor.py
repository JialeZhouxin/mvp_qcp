from typing import Any

from app.core.config import settings
from app.services.execution.gateway import get_execution_gateway


class QiboExecutionError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def _normalize_counts(counts: dict[Any, Any]) -> dict[str, int]:
    normalized: dict[str, int] = {}
    for key, value in counts.items():
        bitstring = str(key)
        parsed = int(value)
        if parsed < 0:
            raise QiboExecutionError("INVALID_EXEC_RESULT", f"count must be non-negative for key: {bitstring}")
        normalized[bitstring] = parsed
    return normalized


def _counts_to_probabilities(counts: dict[str, int]) -> dict[str, float]:
    total = sum(counts.values())
    if total <= 0:
        return {k: 0.0 for k in counts}
    return {k: v / total for k, v in counts.items()}


def execute_qibo_script(code: str) -> dict:
    gateway = get_execution_gateway()
    raw_result = gateway.execute(code, timeout_seconds=settings.qibo_exec_timeout_seconds)

    if not isinstance(raw_result, dict):
        raise QiboExecutionError("INVALID_EXEC_RESULT", "execution result must be a dict")

    if "counts" in raw_result and isinstance(raw_result["counts"], dict):
        counts = _normalize_counts(raw_result["counts"])
        probabilities = raw_result.get("probabilities")
        if not isinstance(probabilities, dict):
            probabilities = _counts_to_probabilities(counts)
        return {"counts": counts, "probabilities": probabilities}

    if raw_result and all(isinstance(k, str) for k in raw_result.keys()):
        counts = _normalize_counts(raw_result)
        return {"counts": counts, "probabilities": _counts_to_probabilities(counts)}

    raise QiboExecutionError("INVALID_EXEC_RESULT", "invalid result format, expected {'counts': {...}}")
