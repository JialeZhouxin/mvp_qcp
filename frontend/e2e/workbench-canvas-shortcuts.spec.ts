import { expect, test } from "@playwright/test";
import { primeAuthenticatedSession } from "./helpers/auth";

test.describe("Workbench shortcuts and canvas viewport", () => {
  test.beforeEach(async ({ page }) => {
    await primeAuthenticatedSession(page);
    await page.goto("/tasks/circuit");
    await expect(page.getByTestId("workbench-primary-layout")).toBeVisible();
  });

  test("supports qubit undo/redo shortcuts", async ({ page }) => {
    const qubitCount = page.getByTestId("qubit-count");
    await expect(qubitCount).toHaveText("2");

    await page.getByRole("button", { name: "+Qubit" }).click();
    await expect(qubitCount).toHaveText("3");

    await page.keyboard.press("ControlOrMeta+z");
    await expect(qubitCount).toHaveText("2");

    await page.keyboard.press("ControlOrMeta+y");
    await expect(qubitCount).toHaveText("3");
  });

  test("supports delete shortcut for selected gate", async ({ page }) => {
    const occupiedCell = page.locator(".canvas-cell--occupied").first();
    await occupiedCell.click();

    const removeButtons = page.locator('[data-testid^="remove-op-"]');
    const initialCount = await removeButtons.count();
    expect(initialCount).toBeGreaterThan(0);

    await page.keyboard.press("Delete");
    await expect(removeButtons).toHaveCount(initialCount - 1);
  });

  test("supports canvas zoom and space-drag pan interaction", async ({ page }) => {
    const zoomPercent = page.getByTestId("canvas-zoom-percent");
    const viewport = page.getByTestId("canvas-viewport");

    await expect(zoomPercent).toHaveText("100%");
    await page.getByTestId("canvas-zoom-in").click();
    await expect(zoomPercent).toHaveText("110%");

    await page.keyboard.press("ControlOrMeta+0");
    await expect(zoomPercent).toHaveText("100%");

    await page.keyboard.down("Space");
    await expect(viewport).toHaveClass(/canvas-viewport--pan-ready/);

    const box = await viewport.boundingBox();
    if (!box) {
      throw new Error("canvas viewport has no bounding box");
    }

    await page.mouse.move(box.x + 40, box.y + 40);
    await page.mouse.down();
    await expect(viewport).toHaveClass(/canvas-viewport--panning/);
    await page.mouse.move(box.x + 160, box.y + 140);
    await page.mouse.up();

    await expect(viewport).not.toHaveClass(/canvas-viewport--panning/);
    await page.keyboard.up("Space");
    await expect(viewport).not.toHaveClass(/canvas-viewport--pan-ready/);
  });
});
