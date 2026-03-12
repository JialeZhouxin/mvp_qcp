import { evaluateComplexity } from "../features/circuit/model/complexity-guard";
import { MAX_DEPTH, MAX_GATES, MAX_QUBITS } from "../features/circuit/model/constants";
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
  it("rejects circuit when qubits exceed limit", () => {
    const model = createCircuit(MAX_QUBITS + 1, []);
    const result = evaluateComplexity(model);

    expect(result.ok).toBe(false);
    expect(result.code).toBe("QUBIT_LIMIT_EXCEEDED");
  });

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

  it("accepts circuit when all values are within limits", () => {
    const model = createCircuit(2, [createOperation("op-1", 0)]);
    const result = evaluateComplexity(model);

    expect(result.ok).toBe(true);
    expect(result.depth).toBe(1);
    expect(result.totalGates).toBe(1);
  });
});

