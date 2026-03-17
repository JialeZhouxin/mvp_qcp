import type { CircuitModel } from "../features/circuit/model/types";
import {
  SimulationScheduleError,
  createSimulationScheduler,
} from "../features/circuit/simulation/scheduler";

const MODEL: CircuitModel = {
  numQubits: 1,
  operations: [{ id: "1", gate: "x", targets: [0], layer: 0 }],
};

describe("simulation scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cancels previous pending request as stale", async () => {
    const runner = vi.fn(async (requestId: string) => ({
      type: "result" as const,
      requestId,
      probabilities: { "0": 0, "1": 1 },
    }));
    const scheduler = createSimulationScheduler({
      debounceMs: 100,
      timeoutMs: 1000,
      runner,
    });

    const first = scheduler.schedule(MODEL);
    const second = scheduler.schedule(MODEL);
    const firstRejected = expect(first).rejects.toMatchObject({ code: "SIM_STALE" });
    const secondResolved = expect(second).resolves.toMatchObject({ requestId: "sim-2" });

    await vi.runAllTimersAsync();

    await firstRejected;
    await secondResolved;
  });

  it("raises timeout when runner does not resolve", async () => {
    const runner = vi.fn(
      () =>
        new Promise<never>(() => {
          // intentionally unresolved
        }),
    );
    const scheduler = createSimulationScheduler({
      debounceMs: 100,
      timeoutMs: 300,
      runner,
    });

    const pending = scheduler.schedule(MODEL);
    const timeoutRejected = expect(pending).rejects.toMatchObject({ code: "SIM_TIMEOUT" });
    const timeoutError = expect(pending).rejects.toBeInstanceOf(SimulationScheduleError);

    await vi.advanceTimersByTimeAsync(500);

    await timeoutError;
    await timeoutRejected;
  });
});
