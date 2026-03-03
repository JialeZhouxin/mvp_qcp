import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it } from "vitest";

import ProtectedRoute from "../components/ProtectedRoute";
import { clearToken, setToken } from "../auth/token";

function renderWithRoutes(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/tasks" element={<div>tasks page</div>} />
        </Route>
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("redirects to login when token is missing", () => {
    clearToken();
    renderWithRoutes("/tasks");
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("renders protected page when token exists", () => {
    setToken("token-1");
    renderWithRoutes("/tasks");
    expect(screen.getByText("tasks page")).toBeInTheDocument();
  });
});
