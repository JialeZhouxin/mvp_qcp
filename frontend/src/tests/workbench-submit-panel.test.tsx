import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";

import WorkbenchSubmitPanel from "../features/circuit/components/WorkbenchSubmitPanel";
import { WORKBENCH_COPY } from "../features/circuit/ui/copy-catalog";

function renderPanel(overrides: Partial<ComponentProps<typeof WorkbenchSubmitPanel>> = {}) {
  const onSubmit = vi.fn();
  render(
    <WorkbenchSubmitPanel
      submitting={false}
      canSubmit={true}
      taskId={null}
      taskStatusLabel="-"
      submitError={null}
      deduplicated={false}
      elapsedSeconds={0}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );

  return { onSubmit };
}

describe("WorkbenchSubmitPanel", () => {
  it("renders compact one-line row and hides removed fields", () => {
    renderPanel();

    const inlineRow = screen.getByTestId("workbench-submit-inline-row");
    expect(inlineRow).toHaveStyle({
      flexWrap: "nowrap",
      whiteSpace: "nowrap",
      overflowX: "auto",
    });
    expect(screen.getByRole("button", { name: WORKBENCH_COPY.submitPanel.submit })).toBeEnabled();
    expect(screen.getByText(`${WORKBENCH_COPY.submitPanel.taskId}: -`)).toBeInTheDocument();
    expect(screen.getByTestId("task-status-text")).toHaveTextContent("-");
    expect(screen.getByTestId("task-elapsed-seconds")).toHaveTextContent("0");
    expect(screen.queryByRole("button", { name: "刷新状态" })).not.toBeInTheDocument();
    expect(screen.queryByText("进入任务中心")).not.toBeInTheDocument();
    expect(screen.queryByText("跟踪进度:")).not.toBeInTheDocument();
    expect(screen.queryByText("跟踪通道:")).not.toBeInTheDocument();
    expect(screen.queryByText("提交后将显示任务 ID 和状态跟踪信息。")).not.toBeInTheDocument();
  });

  it("shows loading state and disables submit while submitting", () => {
    renderPanel({
      submitting: true,
      taskId: 1,
      taskStatusLabel: "排队中",
      elapsedSeconds: 1,
    });

    expect(screen.getByRole("button", { name: WORKBENCH_COPY.submitPanel.submitting })).toBeDisabled();
    expect(screen.getByText(`${WORKBENCH_COPY.submitPanel.taskId}: 1`)).toBeInTheDocument();
    expect(screen.getByTestId("task-status-text")).toHaveTextContent("排队中");
  });

  it("triggers submit callback and shows feedback when provided", () => {
    const { onSubmit } = renderPanel({
      taskId: 10,
      taskStatusLabel: "执行中",
      deduplicated: true,
      submitError: "提交失败",
      elapsedSeconds: 6,
    });

    fireEvent.click(screen.getByRole("button", { name: WORKBENCH_COPY.submitPanel.submit }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText(WORKBENCH_COPY.submitPanel.deduplicatedHint)).toBeInTheDocument();
    expect(screen.getByText("提交失败")).toBeInTheDocument();
  });
});

