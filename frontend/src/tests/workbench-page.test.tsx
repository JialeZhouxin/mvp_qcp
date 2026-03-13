import { fireEvent, render, screen } from "@testing-library/react";

import CircuitWorkbenchPage from "../pages/CircuitWorkbenchPage";

const DRAFT_KEY = "qcp.workbench.draft.v1";
const GUIDE_KEY = "qcp.workbench.guide.dismissed.v1";

describe("CircuitWorkbenchPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
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
    expect(screen.getByText(/状态:/)).toBeInTheDocument();
    expect(screen.getByText(/过滤规则:/)).toBeInTheDocument();
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

  it("shows localized parse error panel with suggestion when qasm is invalid", async () => {
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
    expect(screen.getByTestId("qasm-fix-suggestion")).toBeInTheDocument();
  });

  it("supports clear, undo and redo", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-3",
        probabilities: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
      })),
    };
    render(<CircuitWorkbenchPage scheduler={scheduler} />);
    await vi.runAllTimersAsync();

    const input = screen.getByTestId("qasm-editor-input") as HTMLTextAreaElement;
    expect(input.value).toContain("cx q[0], q[1];");

    fireEvent.click(screen.getByRole("button", { name: "清空线路" }));
    await vi.runAllTimersAsync();
    expect((screen.getByTestId("qasm-editor-input") as HTMLTextAreaElement).value).not.toContain(
      "cx q[0], q[1];",
    );

    fireEvent.click(screen.getByRole("button", { name: "撤销" }));
    await vi.runAllTimersAsync();
    expect((screen.getByTestId("qasm-editor-input") as HTMLTextAreaElement).value).toContain(
      "cx q[0], q[1];",
    );

    fireEvent.click(screen.getByRole("button", { name: "重做" }));
    await vi.runAllTimersAsync();
    expect((screen.getByTestId("qasm-editor-input") as HTMLTextAreaElement).value).not.toContain(
      "cx q[0], q[1];",
    );
  });

  it("switches probability display mode", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-4",
        probabilities: { "00": 0.5, "01": 0.1, "10": 0.02, "11": 0.38 },
      })),
    };
    render(<CircuitWorkbenchPage scheduler={scheduler} />);
    await vi.runAllTimersAsync();

    expect(screen.getByText(/当前显示:\s*3/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("显示全部状态"));
    expect(screen.getByText(/当前显示:\s*4/)).toBeInTheDocument();
    expect(screen.getByText(/隐藏:\s*0/)).toBeInTheDocument();
  });

  it("remembers guide dismissal via localStorage", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-5",
        probabilities: { "00": 1, "01": 0, "10": 0, "11": 0 },
      })),
    };
    const first = render(<CircuitWorkbenchPage scheduler={scheduler} />);
    expect(screen.getByTestId("workbench-guide")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "我知道了" }));
    expect(screen.queryByTestId("workbench-guide")).toBeNull();
    expect(window.localStorage.getItem(GUIDE_KEY)).toBe("1");

    first.unmount();
    render(<CircuitWorkbenchPage scheduler={scheduler} />);
    expect(screen.queryByTestId("workbench-guide")).toBeNull();
  });

  it("loads draft from localStorage on startup", async () => {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: 1,
        circuit: {
          numQubits: 1,
          operations: [{ id: "draft-1", gate: "x", targets: [0], layer: 0 }],
        },
        qasm: "OPENQASM 3;\ninclude \"stdgates.inc\";\nqubit[1] q;\nx q[0];\n",
        displayMode: "ALL",
        updatedAt: Date.now(),
      }),
    );

    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-6",
        probabilities: { "0": 0, "1": 1 },
      })),
    };
    render(<CircuitWorkbenchPage scheduler={scheduler} />);
    await vi.runAllTimersAsync();

    expect((screen.getByTestId("qasm-editor-input") as HTMLTextAreaElement).value).toContain(
      "qubit[1] q;",
    );
    expect(screen.getByLabelText("显示全部状态")).toBeChecked();
  });
});
