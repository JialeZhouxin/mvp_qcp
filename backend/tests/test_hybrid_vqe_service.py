from __future__ import annotations

from collections.abc import Iterator

from app.services.hybrid_vqe import run_vqe_experiment


def _build_probabilities(target_bitstring: str, target_probability: float) -> dict[str, float]:
    fallback = max(0.0, 1.0 - target_probability)
    return {
        target_bitstring: target_probability,
        "1" * len(target_bitstring): fallback,
    }


def test_run_vqe_experiment_builds_three_layer_ansatz_payload() -> None:
    captured_payloads: list[dict[str, object]] = []

    def evaluator(payload: dict[str, object]) -> dict[str, object]:
        captured_payloads.append(payload)
        return {
            "counts": {"00": 1024},
            "probabilities": {"00": 1.0},
        }

    result = run_vqe_experiment(
        {
            "algorithm": "vqe",
            "num_qubits": 2,
            "max_iterations": 12,
            "step_size": 0.2,
            "tolerance": 1e-6,
            "target_bitstring": "00",
        },
        evaluator=evaluator,
    )

    assert captured_payloads
    first_payload = captured_payloads[0]
    operations = first_payload.get("operations")
    assert isinstance(operations, list)
    # 3 layers * (2 RX + 1 CX) + 2 measurements
    assert len(operations) == 11
    assert result["layers"] == 3


def test_run_vqe_experiment_stops_on_current_best_gap_tolerance() -> None:
    target = "00"
    probabilities: Iterator[float] = iter([0.2, 0.25, 0.2494])
    call_count = 0

    def evaluator(_payload: dict[str, object]) -> dict[str, object]:
        nonlocal call_count
        call_count += 1
        probability = next(probabilities)
        return {
            "counts": {"00": int(probability * 1000), "11": int((1 - probability) * 1000)},
            "probabilities": _build_probabilities(target, probability),
        }

    result = run_vqe_experiment(
        {
            "algorithm": "vqe",
            "num_qubits": 2,
            "max_iterations": 50,
            "step_size": 0.2,
            "tolerance": 0.001,
            "target_bitstring": target,
        },
        evaluator=evaluator,
    )

    assert call_count == 3
    assert result["state"] == "success"
    assert result["stop_reason"] == "tolerance"
    assert result["completed_iterations"] == 3
    assert result["current_best_gap"] is not None
    assert abs(float(result["current_best_gap"]) - 0.0006) < 1e-9
