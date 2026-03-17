import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";

import WorkbenchSubmitPanel from "../components/circuit/WorkbenchSubmitPanel";

function renderPanel(overrides: Partial<ComponentProps<typeof WorkbenchSubmitPanel>> = {}) {
  const onSubmit = vi.fn();
  const onRefreshStatus = vi.fn();
  render(
    <MemoryRouter>
      <WorkbenchSubmitPanel
        submitting={false}
        canSubmit={true}
        taskId={null}
        taskStatus={null}
        taskStatusLabel="-"
        submitError={null}
        deduplicated={false}
        trackingMode="idle"
        isTracking={false}
        elapsedSeconds={0}
        onSubmit={onSubmit}
        onRefreshStatus={onRefreshStatus}
        {...overrides}
      />
    </MemoryRouter>,
  );

  return { onSubmit, onRefreshStatus };
}

describe("WorkbenchSubmitPanel", () => {
  it("shows empty task state and disables refresh when no task", () => {
    renderPanel();

    expect(screen.getByText("任务 ID: -")).toBeInTheDocument();
    expect(screen.getByTestId("task-status-text")).toHaveTextContent("-");
    expect(screen.getByRole("button", { name: "刷新状态" })).toBeDisabled();
    expect(screen.getByTestId("task-tracking-mode")).toHaveTextContent("-");
    expect(screen.getByText("提交后将显示任务 ID 和状态跟踪信息。")).toBeInTheDocument();
  });

  it("shows loading state and disables submit while submitting", () => {
    renderPanel({
      submitting: true,
      taskId: 1,
      taskStatus: "PENDING",
      taskStatusLabel: "排队中",
      trackingMode: "sse",
      isTracking: true,
      elapsedSeconds: 1,
    });

    expect(screen.getByRole("button", { name: "提交中..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "刷新状态" })).toBeDisabled();
  });

  it("renders tracking feedback and triggers callbacks", () => {
    const { onSubmit, onRefreshStatus } = renderPanel({
      taskId: 10,
      taskStatus: "RUNNING",
      taskStatusLabel: "执行中",
      deduplicated: true,
      trackingMode: "polling",
      isTracking: true,
      elapsedSeconds: 6,
    });

    fireEvent.click(screen.getByRole("button", { name: "提交任务" }));
    fireEvent.click(screen.getByRole("button", { name: "刷新状态" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onRefreshStatus).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("task-progress-indicator")).toHaveTextContent("进行中");
    expect(screen.getByTestId("task-tracking-mode")).toHaveTextContent("实时连接中断，已降级为轮询");
    expect(screen.getByTestId("task-elapsed-seconds")).toHaveTextContent("6");
    expect(screen.getByText("检测到重复提交，系统已复用已有任务。")).toBeInTheDocument();
  });
});
