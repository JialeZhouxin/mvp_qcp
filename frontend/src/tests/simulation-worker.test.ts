import type { CircuitModel } from "../features/circuit/model/types";
import { executeRequest } from "../features/circuit/simulation/simulation-worker";

function expectClose(value: number, expected: number) {
  expect(value).toBeCloseTo(expected, 6);
}

describe("simulation worker execution", () => {
  it("simulates bell-state circuit probabilities", () => {
    const model: CircuitModel = {
      numQubits: 2,
      operations: [
        { id: "1", gate: "h", targets: [0], layer: 0 },
        { id: "2", gate: "cx", controls: [0], targets: [1], layer: 1 },
      ],
    };

    const response = executeRequest({ requestId: "test-1", model });
    expect(response.type).toBe("result");
    if (response.type !== "result") {
      return;
    }
    expectClose(response.probabilities["00"], 0.5);
    expectClose(response.probabilities["11"], 0.5);
  });

  it("applies p gate phase through interference path", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [
        { id: "1", gate: "h", targets: [0], layer: 0 },
        { id: "2", gate: "p", targets: [0], params: [Math.PI], layer: 1 },
        { id: "3", gate: "h", targets: [0], layer: 2 },
      ],
    };

    const response = executeRequest({ requestId: "p-gate", model });
    expect(response.type).toBe("result");
    if (response.type !== "result") {
      return;
    }
    expectClose(response.probabilities["1"], 1);
  });

  it("applies cp gate phase and produces expected entangled distribution", () => {
    const model: CircuitModel = {
      numQubits: 2,
      operations: [
        { id: "1", gate: "h", targets: [0], layer: 0 },
        { id: "2", gate: "h", targets: [1], layer: 1 },
        { id: "3", gate: "cp", controls: [0], targets: [1], params: [Math.PI], layer: 2 },
        { id: "4", gate: "h", targets: [1], layer: 3 },
      ],
    };

    const response = executeRequest({ requestId: "cp-gate", model });
    expect(response.type).toBe("result");
    if (response.type !== "result") {
      return;
    }
    expectClose(response.probabilities["00"], 0.5);
    expectClose(response.probabilities["11"], 0.5);
  });

  it("applies ccx gate with two active controls", () => {
    const model: CircuitModel = {
      numQubits: 3,
      operations: [
        { id: "1", gate: "x", targets: [0], layer: 0 },
        { id: "2", gate: "x", targets: [1], layer: 1 },
        { id: "3", gate: "ccx", controls: [0, 1], targets: [2], layer: 2 },
      ],
    };

    const response = executeRequest({ requestId: "ccx-gate", model });
    expect(response.type).toBe("result");
    if (response.type !== "result") {
      return;
    }
    expectClose(response.probabilities["111"], 1);
  });

  it("returns execution error on invalid qubit count", () => {
    const model: CircuitModel = {
      numQubits: 0,
      operations: [],
    };
    const response = executeRequest({ requestId: "bad", model });

    expect(response.type).toBe("error");
    if (response.type !== "error") {
      return;
    }
    expect(response.code).toBe("SIM_EXEC_ERROR");
  });
});
