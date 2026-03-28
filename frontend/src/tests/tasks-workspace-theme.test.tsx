import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import TasksWorkspaceLayout from "../components/navigation/TasksWorkspaceLayout";
import { TasksThemeProvider } from "../theme/AppTheme";

describe("TasksWorkspaceLayout theme", () => {
  it("applies the tasks theme scope with light mode", () => {
    render(
      <TasksThemeProvider>
        <MemoryRouter initialEntries={["/tasks/center"]}>
          <Routes>
            <Route path="/tasks" element={<TasksWorkspaceLayout />}>
              <Route path="center" element={<div data-testid="tasks-theme-child" />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TasksThemeProvider>,
    );

    const scope = screen.getByTestId("tasks-theme-child").closest(".tasks-theme-scope");
    expect(scope).not.toBeNull();
    expect(scope).toHaveAttribute("data-theme", "light");
  });
});
