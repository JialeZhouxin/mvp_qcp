import { LOCAL_SIM_MAX_QUBITS, MAX_DEPTH, MAX_GATES } from "./constants";
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

export function getLocalSimulationGuardMessage(model: CircuitModel): string | null {
  if (model.numQubits > LOCAL_SIM_MAX_QUBITS) {
    return `量子比特数量过多（>${LOCAL_SIM_MAX_QUBITS}），已关闭实时模拟；仍可提交后端执行。`;
  }
  return null;
}
