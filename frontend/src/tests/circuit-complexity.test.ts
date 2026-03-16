import {
  evaluateComplexity,
  getLocalSimulationGuardMessage,
} from "../features/circuit/model/complexity-guard";
import { LOCAL_SIM_MAX_QUBITS, MAX_DEPTH, MAX_GATES } from "../features/circuit/model/constants";
import type { CircuitModel, Operation } from "../features/circuit/model/types";

function createOperation(id: string, layer: number): Operation {
  return {
    id,
    gate: "x",
    layer,
    targets: [0],
  };
}

function createCircuit(
  numQubits: number,
  operations: readonly Operation[],
): CircuitModel {
  return { numQubits, operations };
}

describe("evaluateComplexity", () => {
  it("rejects circuit when depth exceeds limit", () => {
    const operations = Array.from({ length: MAX_DEPTH + 1 }).map((_, index) =>
      createOperation(`op-${index}`, index),
    );
    const model = createCircuit(2, operations);
    const result = evaluateComplexity(model);

    expect(result.ok).toBe(false);
    expect(result.code).toBe("DEPTH_LIMIT_EXCEEDED");
  });

  it("rejects circuit when total gates exceed limit", () => {
    const operations = Array.from({ length: MAX_GATES + 1 }).map((_, index) =>
      createOperation(`op-${index}`, 0),
    );
    const model = createCircuit(2, operations);
    const result = evaluateComplexity(model);

    expect(result.ok).toBe(false);
    expect(result.code).toBe("GATE_LIMIT_EXCEEDED");
  });

  it("accepts circuit when depth and gates are within limits", () => {
    const model = createCircuit(20, [createOperation("op-1", 0)]);
    const result = evaluateComplexity(model);

    expect(result.ok).toBe(true);
    expect(result.depth).toBe(1);
    expect(result.totalGates).toBe(1);
  });
});

describe("getLocalSimulationGuardMessage", () => {
  it("returns message when qubits exceed local simulation limit", () => {
    const model = createCircuit(LOCAL_SIM_MAX_QUBITS + 1, []);
    expect(getLocalSimulationGuardMessage(model)).toContain("已关闭实时模拟");
  });

  it("returns null when qubits are within local simulation limit", () => {
    const model = createCircuit(LOCAL_SIM_MAX_QUBITS, []);
    expect(getLocalSimulationGuardMessage(model)).toBeNull();
  });
});
