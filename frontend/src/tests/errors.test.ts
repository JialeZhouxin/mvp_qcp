import { describe, expect, it } from "vitest";

import { toErrorMessage } from "../api/errors";

describe("toErrorMessage", () => {
  it("returns error message when Error is provided", () => {
    const value = toErrorMessage(new Error("boom"), "fallback");
    expect(value).toBe("boom");
  });

  it("returns fallback for non-Error values", () => {
    const value = toErrorMessage("oops", "fallback");
    expect(value).toBe("fallback");
  });
});
