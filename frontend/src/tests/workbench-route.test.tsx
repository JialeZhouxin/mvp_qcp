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

describe("workbench routes", () => {
  beforeEach(() => {
    clearToken();
  });

  it("routes /tasks to /tasks/center for authenticated users", () => {
    setToken("token");
    render(
      <MemoryRouter initialEntries={["/tasks"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("mock-task-center")).toBeInTheDocument();
  });

  it("keeps /tasks/code entry available for authenticated users", () => {
    setToken("token");
    render(
      <MemoryRouter initialEntries={["/tasks/code"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("mock-code-tasks")).toBeInTheDocument();
  });

  it("keeps /tasks/center entry available for authenticated users", () => {
    setToken("token");
    render(
      <MemoryRouter initialEntries={["/tasks/center"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("mock-task-center")).toBeInTheDocument();
  });

  it("keeps /tasks/help entry available for authenticated users", () => {
    setToken("token");
    render(
      <MemoryRouter initialEntries={["/tasks/help"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("mock-task-help")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to login page", () => {
    render(
      <MemoryRouter initialEntries={["/tasks/circuit"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /登/ })).toBeInTheDocument();
  });
});
