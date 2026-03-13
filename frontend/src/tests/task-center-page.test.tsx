import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import TaskCenterPage from "../pages/TaskCenterPage";
import { getTaskCenterDetail, getTaskCenterList } from "../api/task-center";
import { connectTaskStatusStream } from "../features/realtime/task-stream-client";

vi.mock("../api/task-center", () => ({
  getTaskCenterList: vi.fn(),
  getTaskCenterDetail: vi.fn(),
}));

vi.mock("../features/realtime/task-stream-client", () => ({
  connectTaskStatusStream: vi.fn(),
}));

const mockedGetTaskCenterList = vi.mocked(getTaskCenterList);
const mockedGetTaskCenterDetail = vi.mocked(getTaskCenterDetail);
const mockedConnectTaskStatusStream = vi.mocked(connectTaskStatusStream);

describe("TaskCenterPage", () => {
  beforeEach(() => {
    mockedGetTaskCenterList.mockReset();
    mockedGetTaskCenterDetail.mockReset();
    mockedConnectTaskStatusStream.mockReset();
    mockedConnectTaskStatusStream.mockImplementation((_taskIds, _callbacks) => ({
      close: vi.fn(),
    }));
  });

  it("renders list and loads detail", async () => {
    mockedGetTaskCenterList.mockResolvedValue({
      items: [
        {
          task_id: 101,
          status: "FAILURE",
          created_at: "2026-03-13T00:00:00Z",
          updated_at: "2026-03-13T00:01:00Z",
          duration_ms: 500,
          attempt_count: 2,
          has_result: false,
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    });
    mockedGetTaskCenterDetail.mockResolvedValue({
      task_id: 101,
      status: "FAILURE",
      created_at: "2026-03-13T00:00:00Z",
      updated_at: "2026-03-13T00:01:00Z",
      started_at: "2026-03-13T00:00:10Z",
      finished_at: "2026-03-13T00:01:00Z",
      duration_ms: 500,
      attempt_count: 2,
      result: null,
      diagnostic: {
        code: "EXECUTION_TIMEOUT",
        message: "execution timeout",
        phase: "EXECUTION",
        summary: "任务执行超时，未在限定时间内完成。",
        suggestions: ["降低线路复杂度后重试。"],
      },
    });

    render(
      <MemoryRouter>
        <TaskCenterPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /#101/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /#101/ }));

    await waitFor(() => {
      expect(screen.getByText(/诊断：\[EXECUTION_TIMEOUT\]/)).toBeInTheDocument();
    });
  });

  it("shows fallback banner when stream disconnects", async () => {
    mockedGetTaskCenterList.mockResolvedValue({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });
    mockedConnectTaskStatusStream.mockImplementation((_taskIds, callbacks) => {
      setTimeout(() => callbacks.onDisconnect?.(), 0);
      return { close: vi.fn() };
    });

    render(
      <MemoryRouter>
        <TaskCenterPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("实时连接已断开，当前已回退为轮询模式。")).toBeInTheDocument();
    });
  });
});
