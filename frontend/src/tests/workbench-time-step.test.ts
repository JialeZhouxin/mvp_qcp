import type { CircuitModel } from "../features/circuit/model/types";
import {
  clampSimulationStepOnCircuitChange,
  sliceCircuitBySimulationStep,
} from "../features/circuit/ui/workbench-time-step";

const MODEL: CircuitModel = {
  numQubits: 3,
  operations: [
    { id: "b", gate: "h", targets: [1], layer: 0 },
    { id: "a", gate: "x", targets: [0], layer: 0 },
    { id: "c", gate: "m", targets: [2], layer: 1 },
  ],
};

describe("workbench time step helpers", () => {
  it("slices circuit by simulation step using current internal order", () => {
    expect(sliceCircuitBySimulationStep(MODEL, 0).operations).toEqual([]);
    expect(sliceCircuitBySimulationStep(MODEL, 2).operations.map((operation) => operation.id)).toEqual([
      "a",
      "b",
    ]);
    expect(sliceCircuitBySimulationStep(MODEL, 99).operations.map((operation) => operation.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("keeps following the end only when the previous step was at the end", () => {
    expect(clampSimulationStepOnCircuitChange(4, 4, 6)).toBe(6);
    expect(clampSimulationStepOnCircuitChange(2, 4, 6)).toBe(2);
    expect(clampSimulationStepOnCircuitChange(4, 4, 1)).toBe(1);
    expect(clampSimulationStepOnCircuitChange(3, 6, 1)).toBe(1);
  });
});
