from __future__ import annotations

from typing import Any


SUPPORTED_ALGORITHMS = frozenset({"vqe"})
SUPPORTED_PROBLEM_TEMPLATES = frozenset({"bell_state_overlap"})


class HybridPayloadValidationError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def normalize_hybrid_payload(payload: dict[str, Any]) -> dict[str, Any]:
    algorithm = str(payload.get("algorithm", "")).strip().lower()
    if algorithm not in SUPPORTED_ALGORITHMS:
        raise HybridPayloadValidationError("INVALID_HYBRID_ALGORITHM", "unsupported hybrid algorithm")

    problem_template = str(payload.get("problem_template", "")).strip().lower()
    if problem_template not in SUPPORTED_PROBLEM_TEMPLATES:
        raise HybridPayloadValidationError("INVALID_HYBRID_TEMPLATE", "unsupported hybrid problem template")

    max_iterations = int(payload.get("max_iterations", 20))
    if max_iterations < 1 or max_iterations > 10000:
        raise HybridPayloadValidationError("INVALID_HYBRID_MAX_ITERATIONS", "max_iterations out of range [1,10000]")

    step_size = float(payload.get("step_size", 0.2))
    if step_size <= 0 or step_size > 2:
        raise HybridPayloadValidationError("INVALID_HYBRID_STEP_SIZE", "step_size out of range (0,2]")

    tolerance = float(payload.get("tolerance", 1e-3))
    if tolerance <= 0 or tolerance > 1:
        raise HybridPayloadValidationError("INVALID_HYBRID_TOLERANCE", "tolerance out of range (0,1]")

    target_bitstring = str(payload.get("target_bitstring", "00")).strip()
    if not target_bitstring or any(char not in {"0", "1"} for char in target_bitstring):
        raise HybridPayloadValidationError("INVALID_HYBRID_TARGET", "target_bitstring must be non-empty binary string")

    num_qubits = int(payload.get("num_qubits", len(target_bitstring)))
    if num_qubits < 1 or num_qubits > 8:
        raise HybridPayloadValidationError("INVALID_HYBRID_NUM_QUBITS", "num_qubits out of range [1,8]")
    if len(target_bitstring) != num_qubits:
        raise HybridPayloadValidationError(
            "INVALID_HYBRID_TARGET_LENGTH",
            "target_bitstring length must match num_qubits",
        )

    return {
        "algorithm": algorithm,
        "problem_template": problem_template,
        "max_iterations": max_iterations,
        "step_size": step_size,
        "tolerance": tolerance,
        "target_bitstring": target_bitstring,
        "num_qubits": num_qubits,
    }
