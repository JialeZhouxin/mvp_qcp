from __future__ import annotations

from typing import Any

from app.services.circuit_execution import build_qibo_circuit_from_payload


class _GateInstance:
    def __init__(self, name: str, args: tuple[Any, ...], kwargs: dict[str, Any]) -> None:
        self.name = name
        self.args = args
        self.kwargs = kwargs

    def controlled_by(self, *controls: int) -> tuple[str, tuple[int, ...], str, tuple[Any, ...], dict[str, Any]]:
        return ("controlled_by", controls, self.name, self.args, self.kwargs)


class _GateFactory:
    def __getattr__(self, name: str):
        def _factory(*args: Any, **kwargs: Any) -> _GateInstance:
            return _GateInstance(name, args, kwargs)

        return _factory


class _CircuitStub:
    def __init__(self, num_qubits: int) -> None:
        self.num_qubits = num_qubits
        self.operations: list[Any] = []

    def add(self, operation: Any) -> None:
        self.operations.append(operation)


def test_build_qibo_circuit_from_payload_supports_new_gate_mappings() -> None:
    circuit, has_measurement = build_qibo_circuit_from_payload(
        {
            "num_qubits": 3,
            "operations": [
                {"gate": "sx", "targets": [0]},
                {"gate": "sy", "targets": [1]},
                {"gate": "cy", "controls": [0], "targets": [1]},
                {"gate": "ch", "controls": [1], "targets": [2]},
                {"gate": "cswap", "controls": [0], "targets": [1, 2]},
                {"gate": "ccz", "controls": [0, 1], "targets": [2]},
                {"gate": "rxx", "targets": [0, 1], "params": [0.25]},
                {"gate": "ryy", "targets": [1, 2], "params": [0.5]},
                {"gate": "rzz", "targets": [0, 2], "params": [0.75]},
                {"gate": "rzx", "targets": [2, 1], "params": [1.0]},
            ],
        },
        _CircuitStub,
        _GateFactory(),
    )

    assert has_measurement is False
    assert circuit.num_qubits == 3
    assert circuit.operations[0].name == "SX"
    assert circuit.operations[1].name == "RY"
    assert circuit.operations[1].kwargs == {"theta": 3.141592653589793 / 2}
    assert circuit.operations[2] == ("controlled_by", (0,), "Y", (1,), {})
    assert circuit.operations[3] == ("controlled_by", (1,), "H", (2,), {})
    assert circuit.operations[4] == ("controlled_by", (0,), "SWAP", (1, 2), {})
    assert circuit.operations[5].name == "CCZ"
    assert circuit.operations[6].name == "RXX"
    assert circuit.operations[7].name == "RYY"
    assert circuit.operations[8].name == "RZZ"
    assert circuit.operations[9].name == "RZX"
