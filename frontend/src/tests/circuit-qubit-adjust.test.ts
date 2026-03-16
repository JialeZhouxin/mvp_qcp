import { decreaseQubits, increaseQubits } from "../features/circuit/model/circuit-model";
import { EDITOR_MAX_QUBITS, EDITOR_MIN_QUBITS } from "../features/circuit/model/constants";
import type { CircuitModel } from "../features/circuit/model/types";

const boundary = {
  minQubits: EDITOR_MIN_QUBITS,
  maxQubits: EDITOR_MAX_QUBITS,
};

describe("circuit qubit adjust", () => {
  it("increases qubit count within boundary", () => {
    const model: CircuitModel = { numQubits: 2, operations: [] };
    const result = increaseQubits(model, boundary);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.model.numQubits).toBe(3);
    }
  });

  it("blocks increase when max boundary is reached", () => {
    const model: CircuitModel = { numQubits: EDITOR_MAX_QUBITS, operations: [] };
    const result = increaseQubits(model, boundary);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("QUBIT_MAX_REACHED");
    }
  });

  it("decreases qubit count within boundary", () => {
    const model: CircuitModel = { numQubits: 3, operations: [] };
    const result = decreaseQubits(model, boundary);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.model.numQubits).toBe(2);
    }
  });

  it("blocks decrease when operation touches removed qubit index", () => {
    const model: CircuitModel = {
      numQubits: 3,
      operations: [{ id: "op-1", gate: "x", layer: 0, targets: [2] }],
    };
    const result = decreaseQubits(model, boundary);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("QUBIT_SHRINK_BLOCKED_BY_OPERATION");
      expect(result.operationId).toBe("op-1");
    }
  });
});
