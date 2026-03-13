import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { getProjectList } from "../api/projects";
import { getTaskStatus, submitTask } from "../api/tasks";
import CircuitWorkbenchPage from "../pages/CircuitWorkbenchPage";

const DRAFT_KEY = "qcp.workbench.draft.v1";
const GUIDE_KEY = "qcp.workbench.guide.dismissed.v1";

function renderWorkbench(scheduler: { schedule: (model: unknown) => Promise<unknown> }) {
  return render(
    <MemoryRouter>
      <CircuitWorkbenchPage scheduler={scheduler} />
    </MemoryRouter>,
  );
}

async function flushWorkbenchTimers() {
  await act(async () => {
    await vi.runAllTimersAsync();
  });
}

vi.mock("../components/ResultChart", () => ({
  default: () => <div data-testid="mock-result-chart">mock-result-chart</div>,
}));

vi.mock("../api/projects", () => ({
  getProjectList: vi.fn(),
  getProjectDetail: vi.fn(),
  saveProject: vi.fn(),
}));

vi.mock("../api/tasks", () => ({
  submitTask: vi.fn(),
  getTaskStatus: vi.fn(),
  getTaskResult: vi.fn(),
}));

const mockedGetProjectList = vi.mocked(getProjectList);
const mockedSubmitTask = vi.mocked(submitTask);
const mockedGetTaskStatus = vi.mocked(getTaskStatus);

describe("CircuitWorkbenchPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    mockedGetProjectList.mockReset();
    mockedSubmitTask.mockReset();
    mockedGetTaskStatus.mockReset();
    mockedGetProjectList.mockResolvedValue({ projects: [] });
    mockedSubmitTask.mockResolvedValue({ task_id: 1001, status: "PENDING", deduplicated: false });
    mockedGetTaskStatus.mockResolvedValue({ task_id: 1001, status: "RUNNING" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders submit panel and keeps simulation scheduling stable", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-1",
        probabilities: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
      })),
    };
    renderWorkbench(scheduler);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(screen.getByTestId("workbench-submit-panel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "提交任务" })).toBeInTheDocument();
    expect(scheduler.schedule).toHaveBeenCalledTimes(1);
  });

  it("shows parse error helper when qasm is invalid", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-2",
        probabilities: { "00": 1, "01": 0, "10": 0, "11": 0 },
      })),
    };
    renderWorkbench(scheduler);

    fireEvent.change(screen.getByTestId("qasm-editor-input"), {
      target: { value: "OPENQASM 3;\nqubit[1] q\nx q[0];" },
    });
    await flushWorkbenchTimers();
    expect(screen.getByTestId("qasm-fix-suggestion")).toBeInTheDocument();
  });

  it("submits task and renders task status with deduplicated hint", async () => {
    mockedSubmitTask.mockResolvedValue({
      task_id: 88,
      status: "PENDING",
      deduplicated: true,
    });
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-3",
        probabilities: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
      })),
    };
    renderWorkbench(scheduler);
    await flushWorkbenchTimers();

    fireEvent.click(screen.getByRole("button", { name: "提交任务" }));
    await flushWorkbenchTimers();

    expect(mockedSubmitTask).toHaveBeenCalledTimes(1);
    expect(screen.getByText("任务 ID: 88")).toBeInTheDocument();
    expect(screen.getByText("任务状态: PENDING")).toBeInTheDocument();
    expect(screen.getByText("已复用已有任务（幂等去重）")).toBeInTheDocument();
  });

  it("uses stable idempotency key when submitting unchanged circuit repeatedly", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-stable-key",
        probabilities: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
      })),
    };
    renderWorkbench(scheduler);
    await flushWorkbenchTimers();

    fireEvent.click(screen.getByRole("button", { name: "提交任务" }));
    await flushWorkbenchTimers();
    fireEvent.click(screen.getByRole("button", { name: "提交任务" }));
    await flushWorkbenchTimers();

    expect(mockedSubmitTask).toHaveBeenCalledTimes(2);
    const firstOptions = mockedSubmitTask.mock.calls[0][1] as { idempotencyKey?: string };
    const secondOptions = mockedSubmitTask.mock.calls[1][1] as { idempotencyKey?: string };
    expect(firstOptions.idempotencyKey).toBeDefined();
    expect(firstOptions.idempotencyKey).toBe(secondOptions.idempotencyKey);
  });

  it("blocks submit when qasm parse error exists", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-4",
        probabilities: { "00": 1, "01": 0, "10": 0, "11": 0 },
      })),
    };
    renderWorkbench(scheduler);

    fireEvent.change(screen.getByTestId("qasm-editor-input"), {
      target: { value: "OPENQASM 3;\nqubit[1] q\nx q[0];" },
    });
    await flushWorkbenchTimers();
    fireEvent.click(screen.getByRole("button", { name: "提交任务" }));
    await flushWorkbenchTimers();

    expect(mockedSubmitTask).not.toHaveBeenCalled();
    expect(screen.getByText("请先修复 QASM 错误后再提交。")).toBeInTheDocument();
  });

  it("refreshes submitted task status", async () => {
    mockedSubmitTask.mockResolvedValue({ task_id: 120, status: "PENDING", deduplicated: false });
    mockedGetTaskStatus.mockResolvedValue({ task_id: 120, status: "SUCCESS" });
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-5",
        probabilities: { "00": 0.5, "01": 0.5, "10": 0, "11": 0 },
      })),
    };
    renderWorkbench(scheduler);
    await flushWorkbenchTimers();

    fireEvent.click(screen.getByRole("button", { name: "提交任务" }));
    await flushWorkbenchTimers();
    fireEvent.click(screen.getByRole("button", { name: "刷新状态" }));
    await flushWorkbenchTimers();

    expect(mockedGetTaskStatus).toHaveBeenCalledWith(120);
    expect(screen.getByText("任务状态: SUCCESS")).toBeInTheDocument();
  });

  it("remembers guide dismissal via localStorage", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-6",
        probabilities: { "00": 1, "01": 0, "10": 0, "11": 0 },
      })),
    };
    const first = renderWorkbench(scheduler);
    const guide = screen.getByTestId("workbench-guide");
    fireEvent.click(within(guide).getByRole("button"));
    expect(screen.queryByTestId("workbench-guide")).toBeNull();
    expect(window.localStorage.getItem(GUIDE_KEY)).toBe("1");

    first.unmount();
    renderWorkbench(scheduler);
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
        requestId: "sim-7",
        probabilities: { "0": 0, "1": 1 },
      })),
    };
    renderWorkbench(scheduler);
    await flushWorkbenchTimers();

    expect((screen.getByTestId("qasm-editor-input") as HTMLTextAreaElement).value).toContain(
      "qubit[1] q;",
    );
  });
});
