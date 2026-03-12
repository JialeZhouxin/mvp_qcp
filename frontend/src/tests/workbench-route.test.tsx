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

describe("workbench routes", () => {
  beforeEach(() => {
    clearToken();
  });

  it("routes /tasks to /tasks/circuit for authenticated users", () => {
    setToken("token");
    render(
      <MemoryRouter initialEntries={["/tasks"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("mock-circuit-workbench")).toBeInTheDocument();
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

  it("redirects unauthenticated users to login page", () => {
    render(
      <MemoryRouter initialEntries={["/tasks/circuit"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "登录" })).toBeInTheDocument();
  });
});

