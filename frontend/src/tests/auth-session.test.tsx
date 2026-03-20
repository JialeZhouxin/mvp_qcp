import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { AuthSessionProvider, useAuthSession } from "../auth/session";

function SessionHarness() {
  const { token, isAuthenticated, login, logout } = useAuthSession();

  return (
    <section>
      <div data-testid="token">{token ?? "-"}</div>
      <div data-testid="auth">{String(isAuthenticated)}</div>
      <button type="button" onClick={() => login("session-token")}>
        login
      </button>
      <button type="button" onClick={logout}>
        logout
      </button>
    </section>
  );
}

describe("AuthSessionProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hydrates from storage and updates token through login/logout", () => {
    render(
      <AuthSessionProvider>
        <SessionHarness />
      </AuthSessionProvider>,
    );

    expect(screen.getByTestId("token")).toHaveTextContent("-");
    expect(screen.getByTestId("auth")).toHaveTextContent("false");

    fireEvent.click(screen.getByRole("button", { name: "login" }));
    expect(screen.getByTestId("token")).toHaveTextContent("session-token");
    expect(screen.getByTestId("auth")).toHaveTextContent("true");
    expect(localStorage.getItem("qcp_access_token")).toBe("session-token");

    fireEvent.click(screen.getByRole("button", { name: "logout" }));
    expect(screen.getByTestId("token")).toHaveTextContent("-");
    expect(screen.getByTestId("auth")).toHaveTextContent("false");
    expect(localStorage.getItem("qcp_access_token")).toBeNull();
  });
});
