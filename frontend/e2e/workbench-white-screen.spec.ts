import { expect, test } from "@playwright/test";
import { primeAuthenticatedSession } from "./helpers/auth";

test.describe("Circuit workbench runtime stability", () => {
  test.beforeEach(async ({ page }) => {
    await primeAuthenticatedSession(page);
  });

  test("renders workbench without runtime crash", async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => {
      runtimeErrors.push(error.message);
    });

    await page.goto("/tasks/circuit");

    await expect(page.getByTestId("workbench-primary-layout")).toBeVisible();
    await expect(page.getByTestId("qasm-editor-panel")).toBeVisible();
    await expect(page.getByTestId("circuit-canvas-panel")).toBeVisible();
    expect(runtimeErrors).toEqual([]);
  });
});
