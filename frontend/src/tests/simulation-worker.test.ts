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

