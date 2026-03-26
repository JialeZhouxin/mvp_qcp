from __future__ import annotations

from typing import Any


SHOTS = 1024


class CircuitExecutionError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def _normalize_counts(counts: dict[Any, Any]) -> dict[str, int]:
    normalized: dict[str, int] = {}
    for key, value in counts.items():
        parsed = int(value)
        if parsed < 0:
            raise CircuitExecutionError("INVALID_EXEC_RESULT", f"count must be non-negative for key: {key}")
        normalized[str(key)] = parsed
    return normalized


def _counts_to_probabilities(counts: dict[str, int]) -> dict[str, float]:
    total = sum(counts.values())
    if total <= 0:
        return {key: 0.0 for key in counts}
    return {key: value / total for key, value in counts.items()}


def _build_rz(gates: Any, target: int, theta: float) -> Any:
    return gates.RZ(target, theta=theta)


def _build_cnot(gates: Any, control: int, target: int) -> Any:
    return gates.CNOT(control, target)


def build_qibo_circuit_from_payload(payload: dict[str, Any], Circuit: Any, gates: Any) -> tuple[Any, bool]:
    circuit = Circuit(payload["num_qubits"])
    has_measurement = False

    for operation in payload["operations"]:
        gate = operation["gate"]
        targets = operation["targets"]
        controls = operation.get("controls") or []
        params = operation.get("params") or []

        if gate == "m":
            has_measurement = True
            circuit.add(gates.M(targets[0]))
            continue
        if gate == "swap":
            circuit.add(gates.SWAP(targets[0], targets[1]))
            continue
        if gate == "cx":
            circuit.add(_build_cnot(gates, controls[0], targets[0]))
            continue
        if gate == "cz":
            circuit.add(gates.CZ(controls[0], targets[0]))
            continue
        if gate == "cp":
            half_lambda = params[0] / 2
            circuit.add(_build_rz(gates, controls[0], half_lambda))
            circuit.add(_build_cnot(gates, controls[0], targets[0]))
            circuit.add(_build_rz(gates, targets[0], -half_lambda))
            circuit.add(_build_cnot(gates, controls[0], targets[0]))
            circuit.add(_build_rz(gates, targets[0], half_lambda))
            continue
        if gate == "ccx":
            first_control, second_control = controls
            target = targets[0]
            circuit.add(gates.H(target))
            circuit.add(_build_cnot(gates, second_control, target))
            circuit.add(gates.TDG(target))
            circuit.add(_build_cnot(gates, first_control, target))
            circuit.add(gates.T(target))
            circuit.add(_build_cnot(gates, second_control, target))
            circuit.add(gates.TDG(target))
            circuit.add(_build_cnot(gates, first_control, target))
            circuit.add(gates.T(second_control))
            circuit.add(gates.T(target))
            circuit.add(gates.H(target))
            circuit.add(_build_cnot(gates, first_control, second_control))
            circuit.add(gates.T(first_control))
            circuit.add(gates.TDG(second_control))
            circuit.add(_build_cnot(gates, first_control, second_control))
            continue
        if gate == "p":
            circuit.add(_build_rz(gates, targets[0], params[0]))
            continue
        if gate == "u":
            theta, phi, lambda_angle = params
            circuit.add(_build_rz(gates, targets[0], phi))
            circuit.add(gates.RY(targets[0], theta=theta))
            circuit.add(_build_rz(gates, targets[0], lambda_angle))
            continue
        if gate in {"rx", "ry", "rz"}:
            gate_factory = getattr(gates, gate.upper())
            circuit.add(gate_factory(targets[0], theta=params[0]))
            continue

        gate_name = {
            "i": "I",
            "x": "X",
            "y": "Y",
            "z": "Z",
            "h": "H",
            "s": "S",
            "sdg": "SDG",
            "t": "T",
            "tdg": "TDG",
        }.get(gate)
        if gate_name is None:
            raise CircuitExecutionError("INVALID_CIRCUIT_GATE", f"unsupported gate: {gate}")
        circuit.add(getattr(gates, gate_name)(targets[0]))

    if not has_measurement:
        circuit.add(gates.M(*range(payload["num_qubits"])))

    return circuit, has_measurement


def execute_circuit_payload(payload: dict[str, Any]) -> dict[str, Any]:
    from qibo import Circuit, gates

    circuit, _ = build_qibo_circuit_from_payload(payload, Circuit, gates)
    result = circuit(nshots=SHOTS)
    counts = _normalize_counts(dict(result.frequencies(binary=True)))
    return {"counts": counts, "probabilities": _counts_to_probabilities(counts)}
