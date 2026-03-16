import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "../App";
import { clearToken, setToken } from "../auth/token";

vi.mock("../pages/CircuitWorkbenchPage", () => ({
  default: () => <div>mock-circuit-workbench</div>,
}));

vi.mock("../pages/CodeTasksPage", () => ({
  default: () => <div>mock-code-tasks</div>,
}));

vi.mock("../pages/TaskCenterPage", () => ({
  default: () => <div>mock-task-center</div>,
}));

vi.mock("../pages/TaskHelpPage", () => ({
  default: () => <div>mock-task-help</div>,
}));

describe("tasks workspace layout", () => {
  beforeEach(() => {
    clearToken();
    setToken("token");
  });

  it("shows global task navigation and breadcrumb on circuit page", () => {
    render(
      <MemoryRouter initialEntries={["/tasks/circuit"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: "任务模块导航" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "任务中心" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "图形化编程" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "代码提交" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "帮助文档" })).toBeInTheDocument();
    expect(screen.getByText("任务")).toBeInTheDocument();
    expect(screen.getAllByText("图形化编程")).toHaveLength(2);
  });

  it("updates breadcrumb on help page", () => {
    render(
      <MemoryRouter initialEntries={["/tasks/help"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("帮助文档")).toHaveLength(2);
    expect(screen.getByText("mock-task-help")).toBeInTheDocument();
  });
});
