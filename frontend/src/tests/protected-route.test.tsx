import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AuthSessionProvider } from "../auth/session";
import { clearToken, setToken } from "../auth/token";
import ProtectedRoute from "../components/ProtectedRoute";

function renderWithRoutes(initialPath: string) {
  return render(
    <AuthSessionProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/tasks/circuit" element={<div>circuit page</div>} />
            <Route path="/tasks/code" element={<div>code page</div>} />
          </Route>
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthSessionProvider>,
  );
}

describe("ProtectedRoute", () => {
  it("redirects to login when token is missing", () => {
    clearToken();
    renderWithRoutes("/tasks/circuit");
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("renders circuit page when token exists", () => {
    setToken("token-1");
    renderWithRoutes("/tasks/circuit");
    expect(screen.getByText("circuit page")).toBeInTheDocument();
  });

  it("renders code page when token exists", () => {
    setToken("token-1");
    renderWithRoutes("/tasks/code");
    expect(screen.getByText("code page")).toBeInTheDocument();
  });
});
