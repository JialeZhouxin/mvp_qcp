import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import TasksWorkspaceLayout from "../components/navigation/TasksWorkspaceLayout";
import CodeTasksActions from "../features/code-tasks/CodeTasksActions";
import CodeTasksHeader from "../features/code-tasks/CodeTasksHeader";
import CodeTasksResultPanel from "../features/code-tasks/CodeTasksResultPanel";
import TaskListPanel from "../features/task-center/components/TaskListPanel";
import { toTaskStatusLabel } from "../lib/task-status";
import { TasksThemeProvider } from "../theme/AppTheme";

describe("tasks workspace copy sanity", () => {
  it("renders the tasks workspace navigation with Chinese labels", () => {
    render(
      <TasksThemeProvider>
        <MemoryRouter initialEntries={["/tasks/center"]}>
          <Routes>
            <Route path="/tasks" element={<TasksWorkspaceLayout />}>
              <Route path="center" element={<div data-testid="tasks-copy-child" />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TasksThemeProvider>,
    );

    expect(screen.getByText("量子任务工作区")).toBeInTheDocument();
    expect(screen.getAllByText("任务中心")).toHaveLength(2);
    expect(screen.getByText("图形化编程")).toBeInTheDocument();
    expect(screen.getByText("代码任务")).toBeInTheDocument();
  });

  it("renders task list copy without mojibake", () => {
    render(
      <TaskListPanel
        tasks={[
          {
            task_id: 7,
            status: "RUNNING",
            attempt_count: 1,
            duration_ms: 12,
          },
        ]}
        selectedTaskId={7}
        statusFilter="ALL"
        loading={false}
        error={null}
        onSelectTask={() => {}}
        onStatusFilterChange={() => {}}
        onRefresh={() => {}}
      />,
    );

    expect(screen.getByText("任务列表")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "全部状态" })).toBeInTheDocument();
    expect(screen.getByText("刷新")).toBeInTheDocument();
    expect(screen.getByText("重试 1 次 | 耗时 12 ms")).toBeInTheDocument();
  });

  it("renders code task copy without mojibake", () => {
    render(
      <MemoryRouter>
        <CodeTasksHeader onLogout={() => {}} />
        <CodeTasksActions
          taskId={12}
          autoPolling={false}
          onAutoPollingChange={() => {}}
          onRefreshStatus={() => {}}
          onLoadResult={() => {}}
        />
        <CodeTasksResultPanel probabilities={null} resultText="" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Python / Qibo 代码任务")).toBeInTheDocument();
    expect(screen.getByText("进入任务中心")).toBeInTheDocument();
    expect(screen.getByText("刷新任务状态")).toBeInTheDocument();
    expect(screen.getByText("加载任务结果")).toBeInTheDocument();
    expect(screen.getByText("自动轮询")).toBeInTheDocument();
    expect(
      screen.getByText("任务成功后，这里会展示测量概率分布和可视化结果。"),
    ).toBeInTheDocument();
  });

  it("exposes localized task status labels", () => {
    expect(toTaskStatusLabel("RUNNING")).toBe("运行中");
    expect(toTaskStatusLabel("RETRY_EXHAUSTED")).toBe("重试已耗尽");
  });
});
