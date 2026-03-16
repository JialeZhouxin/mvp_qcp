import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import WorkbenchSubmitPanel from "../components/circuit/WorkbenchSubmitPanel";

describe("WorkbenchSubmitPanel", () => {
  it("shows empty task state and disables refresh when no task", () => {
    const onSubmit = vi.fn();
    const onRefreshStatus = vi.fn();
    render(
      <MemoryRouter>
        <WorkbenchSubmitPanel
          submitting={false}
          canSubmit={true}
          taskId={null}
          taskStatus={null}
          submitError={null}
          deduplicated={false}
          onSubmit={onSubmit}
          onRefreshStatus={onRefreshStatus}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("任务 ID: -")).toBeInTheDocument();
    expect(screen.getByText("任务状态: -")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刷新状态" })).toBeDisabled();
    expect(screen.getByText("提交后将显示任务 ID 和实时状态。")).toBeInTheDocument();
  });

  it("shows loading state and disables submit while submitting", () => {
    const onSubmit = vi.fn();
    const onRefreshStatus = vi.fn();
    render(
      <MemoryRouter>
        <WorkbenchSubmitPanel
          submitting={true}
          canSubmit={true}
          taskId={1}
          taskStatus="PENDING"
          submitError={null}
          deduplicated={false}
          onSubmit={onSubmit}
          onRefreshStatus={onRefreshStatus}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "提交中..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "刷新状态" })).toBeDisabled();
  });

  it("renders deduplicated hint and callbacks", () => {
    const onSubmit = vi.fn();
    const onRefreshStatus = vi.fn();
    render(
      <MemoryRouter>
        <WorkbenchSubmitPanel
          submitting={false}
          canSubmit={true}
          taskId={10}
          taskStatus="PENDING"
          submitError={null}
          deduplicated={true}
          onSubmit={onSubmit}
          onRefreshStatus={onRefreshStatus}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "提交任务" }));
    fireEvent.click(screen.getByRole("button", { name: "刷新状态" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onRefreshStatus).toHaveBeenCalledTimes(1);
    expect(screen.getByText("检测到幂等键重复，本次请求复用了已有任务。")).toBeInTheDocument();
  });
});
