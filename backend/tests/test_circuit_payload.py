from app.services.circuit_payload import normalize_circuit_payload


def test_normalize_circuit_payload_accepts_new_gate_shapes() -> None:
    payload = normalize_circuit_payload(
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
        }
    )

    assert payload == {
        "num_qubits": 3,
        "operations": [
            {"gate": "sx", "targets": [0]},
            {"gate": "sy", "targets": [1]},
            {"gate": "cy", "targets": [1], "controls": [0]},
            {"gate": "ch", "targets": [2], "controls": [1]},
            {"gate": "cswap", "targets": [1, 2], "controls": [0]},
            {"gate": "ccz", "targets": [2], "controls": [0, 1]},
            {"gate": "rxx", "targets": [0, 1], "params": [0.25]},
            {"gate": "ryy", "targets": [1, 2], "params": [0.5]},
            {"gate": "rzz", "targets": [0, 2], "params": [0.75]},
            {"gate": "rzx", "targets": [2, 1], "params": [1.0]},
        ],
    }
