from __future__ import annotations

from collections.abc import Callable
import math
from typing import Any

from scipy.optimize import minimize

from app.services.circuit_execution import execute_circuit_payload

DEFAULT_ANSATZ_LAYERS = 3


class HybridExecutionError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class _HybridConverged(RuntimeError):
    pass


class _HybridCancelled(RuntimeError):
    pass


def _build_trial_payload(num_qubits: int, parameters: list[float], layers: int) -> dict[str, Any]:
    operations: list[dict[str, Any]] = []
    expected = num_qubits * layers
    if len(parameters) != expected:
        raise HybridExecutionError(
            "INVALID_HYBRID_PARAMETERS",
            f"expected {expected} parameters for {layers} layers and {num_qubits} qubits",
        )
    for layer in range(layers):
        offset = layer * num_qubits
        for qubit in range(num_qubits):
            operations.append(
                {
                    "gate": "rx",
                    "targets": [qubit],
                    "params": [parameters[offset + qubit]],
                }
            )
        for qubit in range(num_qubits - 1):
            operations.append(
                {
                    "gate": "cx",
                    "controls": [qubit],
                    "targets": [qubit + 1],
                }
            )

    for qubit in range(num_qubits):
        operations.append({"gate": "m", "targets": [qubit]})

    return {"num_qubits": num_qubits, "operations": operations}


def _evaluate_objective(
    *,
    num_qubits: int,
    parameters: list[float],
    target_bitstring: str,
    layers: int,
    evaluator: Callable[[dict[str, Any]], dict[str, Any]],
) -> tuple[float, dict[str, int], dict[str, float]]:
    payload = _build_trial_payload(num_qubits, parameters, layers)
    result = evaluator(payload)
    probabilities_raw = result.get("probabilities")
    counts_raw = result.get("counts")
    if not isinstance(probabilities_raw, dict) or not isinstance(counts_raw, dict):
        raise HybridExecutionError("INVALID_HYBRID_RESULT", "hybrid evaluator must return counts and probabilities")

    probabilities = {str(key): float(value) for key, value in probabilities_raw.items()}
    counts = {str(key): int(value) for key, value in counts_raw.items()}
    objective = max(0.0, 1.0 - float(probabilities.get(target_bitstring, 0.0)))
    return objective, counts, probabilities


def run_vqe_experiment(
    config: dict[str, Any],
    *,
    on_iteration: Callable[[dict[str, Any], dict[str, Any]], None] | None = None,
    should_stop: Callable[[], bool] | None = None,
    evaluator: Callable[[dict[str, Any]], dict[str, Any]] = execute_circuit_payload,
) -> dict[str, Any]:
    algorithm = str(config.get("algorithm", "vqe")).lower()
    if algorithm != "vqe":
        raise HybridExecutionError("INVALID_HYBRID_ALGORITHM", f"unsupported algorithm: {algorithm}")

    num_qubits = int(config.get("num_qubits", 2))
    max_iterations = int(config.get("max_iterations", 20))
    step_size = float(config.get("step_size", 0.2))
    tolerance = float(config.get("tolerance", 1e-3))
    target_bitstring = str(config.get("target_bitstring", "00"))
    layers = int(config.get("layers", DEFAULT_ANSATZ_LAYERS))
    if num_qubits < 1:
        raise HybridExecutionError("INVALID_HYBRID_NUM_QUBITS", "num_qubits must be positive")
    if len(target_bitstring) != num_qubits:
        raise HybridExecutionError("INVALID_HYBRID_TARGET", "target_bitstring length must equal num_qubits")
    if layers < 1:
        raise HybridExecutionError("INVALID_HYBRID_LAYERS", "layers must be positive")
    if max_iterations < 1:
        raise HybridExecutionError("INVALID_HYBRID_MAX_ITERATIONS", "max_iterations must be positive")
    if step_size <= 0:
        raise HybridExecutionError("INVALID_HYBRID_STEP_SIZE", "step_size must be positive")

    parameters = [0.15 for _ in range(num_qubits * layers)]
    best_parameters = list(parameters)
    best_objective = float("inf")
    latest_objective = float("inf")
    latest_current_best_gap: float | None = None
    best_counts: dict[str, int] = {}
    best_probabilities: dict[str, float] = {}
    iterations: list[dict[str, Any]] = []
    completed_iterations = 0
    stop_reason = "max_iterations"
    cancelled = False
    converged_by_gap = False

    def _should_stop() -> bool:
        return bool(should_stop and should_stop())

    def objective_fn(candidate: Any) -> float:
        nonlocal best_objective
        nonlocal best_parameters
        nonlocal latest_objective
        nonlocal latest_current_best_gap
        nonlocal best_counts
        nonlocal best_probabilities
        nonlocal completed_iterations
        nonlocal converged_by_gap
        if _should_stop():
            raise _HybridCancelled()

        candidate_parameters = [float(value) for value in candidate]
        objective, counts, probabilities = _evaluate_objective(
            num_qubits=num_qubits,
            parameters=candidate_parameters,
            target_bitstring=target_bitstring,
            layers=layers,
            evaluator=evaluator,
        )
        completed_iterations += 1
        latest_objective = objective

        previous_best = best_objective
        accepted = objective <= best_objective
        if accepted:
            best_objective = objective
            best_parameters = list(candidate_parameters)
            best_counts = counts
            best_probabilities = probabilities
        current_best_gap = max(0.0, objective - best_objective)
        latest_current_best_gap = current_best_gap

        trace_item = {
            "iteration": completed_iterations,
            "objective": objective,
            "best_objective": best_objective,
            "current_best_gap": current_best_gap,
            "accepted": accepted,
            "parameters": list(candidate_parameters),
        }
        iterations.append(trace_item)

        running_state = {
            "algorithm": "vqe",
            "optimizer": "cobyla",
            "state": "running",
            "current_iteration": completed_iterations,
            "completed_iterations": completed_iterations,
            "max_iterations": max_iterations,
            "latest_objective": latest_objective,
            "best_objective": best_objective,
            "current_best_gap": current_best_gap,
            "best_parameters": best_parameters,
            "target_bitstring": target_bitstring,
            "num_qubits": num_qubits,
            "layers": layers,
            "iterations": list(iterations),
        }
        if on_iteration is not None:
            on_iteration(trace_item, running_state)

        comparable = completed_iterations > 1 and math.isfinite(previous_best)
        if comparable and abs(objective - previous_best) <= tolerance:
            converged_by_gap = True
            raise _HybridConverged()

        return objective

    if _should_stop():
        cancelled = True
        stop_reason = "cancelled"
    else:
        try:
            minimize(
                objective_fn,
                x0=parameters,
                method="COBYLA",
                options={
                    "maxiter": max_iterations,
                    "rhobeg": step_size,
                },
            )
            if converged_by_gap:
                stop_reason = "tolerance"
            elif completed_iterations >= max_iterations:
                stop_reason = "max_iterations"
            else:
                stop_reason = "optimizer_terminated"
        except _HybridConverged:
            stop_reason = "tolerance"
        except _HybridCancelled:
            cancelled = True
            stop_reason = "cancelled"

    state = "cancelled" if cancelled or _should_stop() else "success"
    return {
        "algorithm": "vqe",
        "optimizer": "cobyla",
        "state": state,
        "stop_reason": stop_reason,
        "completed_iterations": completed_iterations,
        "max_iterations": max_iterations,
        "latest_objective": latest_objective if latest_objective != float("inf") else None,
        "best_objective": best_objective if best_objective != float("inf") else None,
        "current_best_gap": latest_current_best_gap,
        "best_parameters": best_parameters if best_objective != float("inf") else [],
        "target_bitstring": target_bitstring,
        "num_qubits": num_qubits,
        "layers": layers,
        "iterations": iterations,
        "best_measurement": {
            "counts": best_counts,
            "probabilities": best_probabilities,
        },
    }
