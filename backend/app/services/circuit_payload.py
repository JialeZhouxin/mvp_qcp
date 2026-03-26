from __future__ import annotations

from typing import Any


class CircuitPayloadValidationError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


_SINGLE_QUBIT_GATES = {"i", "x", "y", "z", "h", "s", "sdg", "t", "tdg", "m"}
_PARAMETERIZED_GATES = {"rx", "ry", "rz", "u", "p"}
_CONTROLLED_GATES = {"cx", "cp", "cz"}
_MULTI_QUBIT_GATES = {"swap", "ccx"}
_SUPPORTED_GATES = _SINGLE_QUBIT_GATES | _PARAMETERIZED_GATES | _CONTROLLED_GATES | _MULTI_QUBIT_GATES


def _require_int_list(raw: Any, field_name: str, expected_count: int | None = None) -> list[int]:
    if not isinstance(raw, list):
        raise CircuitPayloadValidationError("INVALID_CIRCUIT_PAYLOAD", f"{field_name} must be a list")
    values: list[int] = []
    for item in raw:
        if not isinstance(item, int):
            raise CircuitPayloadValidationError("INVALID_CIRCUIT_PAYLOAD", f"{field_name} must contain integers")
        values.append(item)
    if expected_count is not None and len(values) != expected_count:
        suffix = "s" if expected_count != 1 else ""
        raise CircuitPayloadValidationError(
            "INVALID_CIRCUIT_PAYLOAD",
            f"{field_name} expects {expected_count} value{suffix}",
        )
    return values


def _require_float_list(raw: Any, expected_count: int) -> list[float]:
    if not isinstance(raw, list):
        raise CircuitPayloadValidationError("INVALID_CIRCUIT_PAYLOAD", "params must be a list")
    values: list[float] = []
    for item in raw:
        if not isinstance(item, (int, float)):
            raise CircuitPayloadValidationError("INVALID_CIRCUIT_PAYLOAD", "params must contain numbers")
        values.append(float(item))
    if len(values) != expected_count:
        suffix = "s" if expected_count != 1 else ""
        raise CircuitPayloadValidationError(
            "INVALID_CIRCUIT_PAYLOAD",
            f"params expects {expected_count} value{suffix}",
        )
    return values


def _validate_qubit_range(num_qubits: int, values: list[int], field_name: str) -> None:
    for value in values:
        if value < 0 or value >= num_qubits:
            raise CircuitPayloadValidationError(
                "INVALID_CIRCUIT_PAYLOAD",
                f"{field_name} contains out-of-range qubit: {value}",
            )


def _normalize_operation(operation: dict[str, Any], num_qubits: int) -> dict[str, Any]:
    raw_gate = operation.get("gate")
    if not isinstance(raw_gate, str):
        raise CircuitPayloadValidationError("INVALID_CIRCUIT_PAYLOAD", "gate must be a string")
    gate = raw_gate.strip().lower()
    if gate not in _SUPPORTED_GATES:
        raise CircuitPayloadValidationError("INVALID_CIRCUIT_PAYLOAD", f"unsupported gate: {gate}")

    normalized: dict[str, Any] = {"gate": gate}

    if gate == "swap":
        targets = _require_int_list(operation.get("targets"), "targets", expected_count=2)
    else:
        targets = _require_int_list(operation.get("targets"), "targets", expected_count=1)
    _validate_qubit_range(num_qubits, targets, "targets")
    normalized["targets"] = targets

    if gate in _CONTROLLED_GATES:
        controls = _require_int_list(operation.get("controls"), "controls", expected_count=1)
        _validate_qubit_range(num_qubits, controls, "controls")
        normalized["controls"] = controls
    elif gate == "ccx":
        controls = _require_int_list(operation.get("controls"), "controls", expected_count=2)
        _validate_qubit_range(num_qubits, controls, "controls")
        normalized["controls"] = controls

    if gate in {"rx", "ry", "rz", "p", "cp"}:
        normalized["params"] = _require_float_list(operation.get("params"), expected_count=1)
    elif gate == "u":
        normalized["params"] = _require_float_list(operation.get("params"), expected_count=3)

    return normalized


def normalize_circuit_payload(raw_payload: dict[str, Any]) -> dict[str, Any]:
    num_qubits = raw_payload.get("num_qubits")
    if not isinstance(num_qubits, int) or num_qubits <= 0:
        raise CircuitPayloadValidationError("INVALID_CIRCUIT_PAYLOAD", "num_qubits must be a positive integer")

    operations = raw_payload.get("operations")
    if not isinstance(operations, list):
        raise CircuitPayloadValidationError("INVALID_CIRCUIT_PAYLOAD", "operations must be a list")

    return {
        "num_qubits": num_qubits,
        "operations": [_normalize_operation(operation, num_qubits) for operation in operations],
    }
