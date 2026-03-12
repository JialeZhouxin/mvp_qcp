import { MAX_DEPTH, MAX_GATES, MAX_QUBITS } from "./constants";
import { getCircuitDepth, getTotalGates } from "./circuit-model";
import type { CircuitModel, ComplexityErrorCode, ComplexityReport } from "./types";

function createExceededResult(
  model: CircuitModel,
  depth: number,
  totalGates: number,
  code: ComplexityErrorCode,
  message: string,
): ComplexityReport {
  return {
    ok: false,
    qubits: model.numQubits,
    depth,
    totalGates,
    code,
    message,
  };
}

function createOkResult(
  model: CircuitModel,
  depth: number,
  totalGates: number,
): ComplexityReport {
  return {
    ok: true,
    qubits: model.numQubits,
    depth,
    totalGates,
  };
}

export function evaluateComplexity(model: CircuitModel): ComplexityReport {
  const depth = getCircuitDepth(model);
  const totalGates = getTotalGates(model);

  if (model.numQubits > MAX_QUBITS) {
    return createExceededResult(
      model,
      depth,
      totalGates,
      "QUBIT_LIMIT_EXCEEDED",
      `qubits ${model.numQubits} exceeds limit ${MAX_QUBITS}`,
    );
  }
  if (depth > MAX_DEPTH) {
    return createExceededResult(
      model,
      depth,
      totalGates,
      "DEPTH_LIMIT_EXCEEDED",
      `depth ${depth} exceeds limit ${MAX_DEPTH}`,
    );
  }
  if (totalGates > MAX_GATES) {
    return createExceededResult(
      model,
      depth,
      totalGates,
      "GATE_LIMIT_EXCEEDED",
      `total gates ${totalGates} exceeds limit ${MAX_GATES}`,
    );
  }
  return createOkResult(model, depth, totalGates);
}

