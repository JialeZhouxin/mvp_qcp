from typing import Any

from app.core.config import settings
from app.services.execution.factory import get_execution_backend


def _normalize_counts(counts: dict[Any, Any]) -> dict[str, int]:
    normalized: dict[str, int] = {}
    for key, value in counts.items():
        bitstring = str(key)
        parsed = int(value)
        if parsed < 0:
            raise ValueError(f"count must be non-negative for key: {bitstring}")
        normalized[bitstring] = parsed
    return normalized


def _counts_to_probabilities(counts: dict[str, int]) -> dict[str, float]:
    total = sum(counts.values())
    if total <= 0:
        return {k: 0.0 for k in counts}
    return {k: v / total for k, v in counts.items()}


def execute_qibo_script(code: str) -> dict:
    backend = get_execution_backend()
    raw_result = backend.execute(code, timeout_seconds=settings.qibo_exec_timeout_seconds)

    if not isinstance(raw_result, dict):
        raise ValueError("execution result must be a dict")

    if "counts" in raw_result and isinstance(raw_result["counts"], dict):
        counts = _normalize_counts(raw_result["counts"])
        probabilities = raw_result.get("probabilities")
        if not isinstance(probabilities, dict):
            probabilities = _counts_to_probabilities(counts)
        return {"counts": counts, "probabilities": probabilities}

    # 兼容格式：直接返回 bitstring -> count
    if raw_result and all(isinstance(k, str) for k in raw_result.keys()):
        counts = _normalize_counts(raw_result)
        return {"counts": counts, "probabilities": _counts_to_probabilities(counts)}

    raise ValueError("invalid result format, expected {'counts': {...}}")
