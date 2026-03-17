import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

  it("renders gate, canvas and qasm in the primary layout before result panel", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-layout",
        probabilities: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
      })),
    };
    renderWorkbench(scheduler);
    await flushTimers();

    const primaryLayout = screen.getByTestId("workbench-primary-layout");
    expect(within(primaryLayout).getByTestId("gate-palette-panel")).toBeInTheDocument();
    expect(within(primaryLayout).getByTestId("circuit-canvas-panel")).toBeInTheDocument();
    expect(within(primaryLayout).getByTestId("qasm-editor-panel")).toBeInTheDocument();

    const resultPanel = screen.getByTestId("workbench-result-panel");
    const relation = primaryLayout.compareDocumentPosition(resultPanel);
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

  it("supports undo and redo via keyboard shortcuts", async () => {
    const scheduler = {
      schedule: vi.fn(async () => ({
        requestId: "sim-hotkey-undo-redo",
        probabilities: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
      })),
    };
    renderWorkbench(scheduler);
    await flushTimers();

    expect(screen.getByTestId("qubit-count")).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: "+Qubit" }));
    expect(screen.getByTestId("qubit-count")).toHaveTextContent("3");

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(screen.getByTestId("qubit-count")).toHaveTextContent("2");

    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(screen.getByTestId("qubit-count")).toHaveTextContent("3");
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

    for (let i = 0; i < 8; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: "+Qubit" }));
    }
    await flushTimers();
    const callsAtQubit10 = scheduler.schedule.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "+Qubit" }));
    await flushTimers();

    expect(screen.getByTestId("qubit-count")).toHaveTextContent("11");
    expect(scheduler.schedule).toHaveBeenCalledTimes(callsAtQubit10);

    const submitPanel = screen.getByTestId("workbench-submit-panel");
    const submitButton = within(submitPanel).getAllByRole("button")[0];
    expect(submitButton).toBeEnabled();
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

    const submitPanel = screen.getByTestId("workbench-submit-panel");
    const [submitButton, refreshButton] = within(submitPanel).getAllByRole("button");

    fireEvent.click(submitButton);
    await flushTimers();
    fireEvent.click(refreshButton);
    await flushTimers();

    expect(mockedSubmitTask).toHaveBeenCalledTimes(1);
    expect(mockedGetTaskStatus).toHaveBeenCalledWith(120);
  });
});
