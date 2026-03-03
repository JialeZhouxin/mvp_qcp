import { beforeEach, describe, expect, it } from "vitest";

import { clearToken, getToken, setToken } from "../auth/token";

describe("token storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and reads token", () => {
    setToken("abc123");
    expect(getToken()).toBe("abc123");
  });

  it("clears token", () => {
    setToken("abc123");
    clearToken();
    expect(getToken()).toBeNull();
  });
});
