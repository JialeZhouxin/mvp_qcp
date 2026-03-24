import { act, renderHook } from "@testing-library/react";

import type { CircuitModel } from "../features/circuit/model/types";
import { useWorkbenchSimulation } from "../features/circuit/simulation/use-workbench-simulation";

const MODEL: CircuitModel = {
  numQubits: 1,
  operations: [{ id: "op-1", gate: "x", targets: [0], layer: 0 }],
};

describe("useWorkbenchSimulation", () => {
  it("runs simulation and exposes filtered probability view", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-1",
        probabilities: { "0": 0.25, "1": 0.75 },
      })),
    };

    const { result } = renderHook(() =>
      useWorkbenchSimulation({
        circuit: MODEL,
        displayMode: "FILTERED",
        executionGateCount: 1,
        scheduler,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(scheduler.schedule).toHaveBeenCalledWith(MODEL, { executionGateCount: 1 });
    expect(result.current.simulationState).toBe("READY");
    expect(result.current.probabilityView?.visible["1"]).toBe(0.75);
    expect(result.current.epsilonText).not.toBe("--");
  });

  it("surfaces scheduler failures as simulation errors", async () => {
    const scheduler = {
      schedule: vi.fn(async () => {
        throw new Error("boom");
      }),
    };

    const { result } = renderHook(() =>
      useWorkbenchSimulation({
        circuit: MODEL,
        displayMode: "FILTERED",
        scheduler,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.simulationState).toBe("ERROR");
    expect(result.current.simError).toBeTruthy();
  });
});
