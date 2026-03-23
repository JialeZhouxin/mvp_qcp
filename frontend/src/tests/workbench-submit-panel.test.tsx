import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";

import WorkbenchSubmitPanel from "../features/circuit/components/WorkbenchSubmitPanel";

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
    expect(screen.getByRole("button", { name: "鎻愪氦浠诲姟" })).toBeEnabled();
    expect(screen.getByText("浠诲姟 ID: -")).toBeInTheDocument();
    expect(screen.getByTestId("task-status-text")).toHaveTextContent("-");
    expect(screen.getByTestId("task-elapsed-seconds")).toHaveTextContent("0");
    expect(screen.queryByRole("button", { name: "鍒锋柊鐘舵€? })).not.toBeInTheDocument();
    expect(screen.queryByText("杩涘叆浠诲姟涓績")).not.toBeInTheDocument();
    expect(screen.queryByText("璺熻釜杩涘害:")).not.toBeInTheDocument();
    expect(screen.queryByText("璺熻釜閫氶亾:")).not.toBeInTheDocument();
    expect(screen.queryByText("鎻愪氦鍚庡皢鏄剧ず浠诲姟 ID 鍜岀姸鎬佽窡韪俊鎭€?)).not.toBeInTheDocument();
  });

  it("shows loading state and disables submit while submitting", () => {
    renderPanel({
      submitting: true,
      taskId: 1,
      taskStatusLabel: "鎺掗槦涓?,
      elapsedSeconds: 1,
    });

    expect(screen.getByRole("button", { name: "鎻愪氦涓?.." })).toBeDisabled();
    expect(screen.getByText("浠诲姟 ID: 1")).toBeInTheDocument();
    expect(screen.getByTestId("task-status-text")).toHaveTextContent("鎺掗槦涓?);
  });

  it("triggers submit callback and shows feedback when provided", () => {
    const { onSubmit } = renderPanel({
      taskId: 10,
      taskStatusLabel: "鎵ц涓?,
      deduplicated: true,
      submitError: "鎻愪氦澶辫触",
      elapsedSeconds: 6,
    });

    fireEvent.click(screen.getByRole("button", { name: "鎻愪氦浠诲姟" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText("妫€娴嬪埌閲嶅鎻愪氦锛岀郴缁熷凡澶嶇敤宸叉湁浠诲姟銆?)).toBeInTheDocument();
    expect(screen.getByText("鎻愪氦澶辫触")).toBeInTheDocument();
  });
});


