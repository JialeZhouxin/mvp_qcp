import { validateCircuitModel } from "../features/circuit/model/circuit-validation";
import type { CircuitModel } from "../features/circuit/model/types";

describe("validateCircuitModel", () => {
  it("rejects conflicting operations on same layer/qubit", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [
        { id: "op-1", gate: "x", targets: [0], layer: 0 },
        { id: "op-2", gate: "h", targets: [0], layer: 0 },
      ],
    };
    const result = validateCircuitModel(model);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("CELL_CONFLICT");
  });

  it("rejects non-terminal measurement", () => {
    const model: CircuitModel = {
      numQubits: 2,
      operations: [
        { id: "op-1", gate: "m", targets: [0], layer: 0 },
        { id: "op-2", gate: "h", targets: [1], layer: 1 },
      ],
    };
    const result = validateCircuitModel(model);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("NON_TERMINAL_MEASUREMENT");
  });

  it("accepts model with terminal measurement only", () => {
    const model: CircuitModel = {
      numQubits: 2,
      operations: [
        { id: "op-1", gate: "h", targets: [0], layer: 0 },
        { id: "op-2", gate: "cx", controls: [0], targets: [1], layer: 1 },
        { id: "op-3", gate: "m", targets: [0], layer: 2 },
        { id: "op-4", gate: "m", targets: [1], layer: 2 },
      ],
    };
    const result = validateCircuitModel(model);

    expect(result.ok).toBe(true);
  });

  it("rejects operations placed inside a multi-qubit connector span on the same layer", () => {
    const model: CircuitModel = {
      numQubits: 4,
      operations: [
        { id: "op-cx", gate: "cx", controls: [0], targets: [3], layer: 0 },
        { id: "op-x", gate: "x", targets: [1], layer: 0 },
      ],
    };
    const result = validateCircuitModel(model);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("CELL_CONFLICT");
  });
});
