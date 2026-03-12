import { fireEvent, render, screen } from "@testing-library/react";

import CircuitWorkbenchPage from "../pages/CircuitWorkbenchPage";

describe("CircuitWorkbenchPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders simulation stats with injected scheduler result", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-1",
        probabilities: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
      })),
    };
    render(<CircuitWorkbenchPage scheduler={scheduler} />);

    await vi.runAllTimersAsync();
    expect(screen.getByText(/总状态数:/)).toBeInTheDocument();
    expect(screen.getByText(/可见:/)).toBeInTheDocument();
    expect(screen.getByText(/状态:/)).toBeInTheDocument();
  });

  it("does not trigger endless simulation reschedule for unchanged qasm", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-loop-check",
        probabilities: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
      })),
    };
    render(<CircuitWorkbenchPage scheduler={scheduler} />);

    await vi.advanceTimersByTimeAsync(1500);
    expect(scheduler.schedule.mock.calls.length).toBe(1);
  });

  it("shows parse error panel when qasm is invalid", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-2",
        probabilities: { "00": 1, "01": 0, "10": 0, "11": 0 },
      })),
    };
    render(<CircuitWorkbenchPage scheduler={scheduler} />);

    fireEvent.change(screen.getByTestId("qasm-editor-input"), {
      target: { value: "OPENQASM 3;\nqubit[1] q\nx q[0];" },
    });
    await vi.runAllTimersAsync();
    expect(screen.getByText("QASM 解析错误")).toBeInTheDocument();
  });
});
