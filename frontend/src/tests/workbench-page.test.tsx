import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { getProjectList } from "../api/projects";
import { getTaskStatus, submitTask } from "../api/tasks";
import CircuitWorkbenchPage from "../pages/CircuitWorkbenchPage";

function renderWorkbench(scheduler: { schedule: (model: unknown) => Promise<unknown> }) {
  return render(
    <MemoryRouter>
      <CircuitWorkbenchPage scheduler={scheduler} />
    </MemoryRouter>,
  );
}

async function flushTimers() {
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

  it("renders result panel before submit panel", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-order",
        probabilities: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
      })),
    };
    renderWorkbench(scheduler);
    await flushTimers();

    const resultPanel = screen.getByTestId("workbench-result-panel");
    const submitPanel = screen.getByTestId("workbench-submit-panel");
    const relation = resultPanel.compareDocumentPosition(submitPanel);
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("supports +Qubit and -Qubit operations", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-qubit-op",
        probabilities: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
      })),
    };
    renderWorkbench(scheduler);
    await flushTimers();

    expect(screen.getByTestId("qubit-count")).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: "+Qubit" }));
    expect(screen.getByTestId("qubit-count")).toHaveTextContent("3");
    fireEvent.click(screen.getByRole("button", { name: "-Qubit" }));
    expect(screen.getByTestId("qubit-count")).toHaveTextContent("2");
  });

  it("disables local simulation when qubits exceed 10 but keeps submit enabled", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-disable",
        probabilities: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
      })),
    };
    renderWorkbench(scheduler);
    await flushTimers();

    for (let i = 0; i < 9; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: "+Qubit" }));
    }
    await flushTimers();

    expect(screen.getByTestId("qubit-count")).toHaveTextContent("11");
    expect(screen.getByText(/已关闭实时模拟/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "提交任务" })).toBeEnabled();
  });

  it("submits task and refreshes status", async () => {
    mockedSubmitTask.mockResolvedValue({ task_id: 120, status: "PENDING", deduplicated: false });
    mockedGetTaskStatus.mockResolvedValue({ task_id: 120, status: "SUCCESS" });
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-submit",
        probabilities: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
      })),
    };
    renderWorkbench(scheduler);
    await flushTimers();

    fireEvent.click(screen.getByRole("button", { name: "提交任务" }));
    await flushTimers();
    fireEvent.click(screen.getByRole("button", { name: "刷新状态" }));
    await flushTimers();

    expect(mockedSubmitTask).toHaveBeenCalledTimes(1);
    expect(mockedGetTaskStatus).toHaveBeenCalledWith(120);
    expect(screen.getByText("任务状态: SUCCESS")).toBeInTheDocument();
  });
});
