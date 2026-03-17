import { expect, test } from "@playwright/test";
import { primeAuthenticatedSession } from "./helpers/auth";

test.describe("Task workspace routing and navigation", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/tasks/circuit");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("keeps task routes reachable for authenticated users", async ({ page }) => {
    await primeAuthenticatedSession(page);

    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/tasks\/center$/);

    await page.locator('a[href="/tasks/help"]').first().click();
    await expect(page).toHaveURL(/\/tasks\/help$/);

    await page.locator('a[href="/tasks/code"]').first().click();
    await expect(page).toHaveURL(/\/tasks\/code$/);

    await page.locator('a[href="/tasks/circuit"]').first().click();
    await expect(page).toHaveURL(/\/tasks\/circuit$/);
    await expect(page.getByTestId("workbench-primary-layout")).toBeVisible();
  });
});
