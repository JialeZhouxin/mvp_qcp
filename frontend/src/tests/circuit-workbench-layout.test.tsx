import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import CircuitWorkbenchPage from "../pages/CircuitWorkbenchPage";

function isBefore(first: Node, second: Node): boolean {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("CircuitWorkbenchPage layout", () => {
  it("keeps submit panel in sticky rail above primary workbench layout", async () => {
    render(
      <MemoryRouter>
        <CircuitWorkbenchPage
          scheduler={{
            schedule: async () => ({
              requestId: "sim-test",
              probabilities: { "0": 1 },
            }),
          }}
        />
      </MemoryRouter>,
    );

    const workbenchShell = await screen.findByTestId("circuit-workbench-shell");
    const submitRail = await screen.findByTestId("workbench-submit-rail");
    const submitPanel = await screen.findByTestId("workbench-submit-panel");
    const primaryLayout = await screen.findByTestId("workbench-primary-layout");
    const mainWorkspace = await screen.findByTestId("workbench-main-workspace");
    const canvasPanel = await screen.findByTestId("circuit-canvas-panel");
    const resultPanel = await screen.findByTestId("workbench-result-panel");
    const canvasToolbar = await screen.findByTestId("canvas-workbench-toolbar");
    const canvasToolbarTop = await screen.findByTestId("canvas-workbench-topbar");
    const canvasToolbarTimeline = await screen.findByTestId("canvas-workbench-timeline");
    const viewportShell = await screen.findByTestId("canvas-viewport-shell");

    expect(workbenchShell).toHaveClass("circuit-workbench-shell");
    expect(workbenchShell.getAttribute("style") ?? "").not.toContain("max-width");
    expect(submitRail).toContainElement(submitPanel);
    expect(isBefore(submitRail, primaryLayout)).toBe(true);
    expect(submitRail).toHaveStyle({ position: "sticky" });
    expect(submitRail).toHaveStyle({ top: "12px" });
    expect(primaryLayout).toHaveClass("circuit-workbench-primary-layout");
    expect(primaryLayout).toContainElement(mainWorkspace);
    expect(mainWorkspace).toContainElement(canvasPanel);
    expect(primaryLayout).toContainElement(resultPanel);
    expect(isBefore(mainWorkspace, resultPanel)).toBe(true);
    expect(canvasPanel).toContainElement(canvasToolbar);
    expect(canvasToolbar).toContainElement(canvasToolbarTop);
    expect(canvasToolbar).toContainElement(canvasToolbarTimeline);
    expect(canvasPanel).toContainElement(viewportShell);
    expect(screen.getByTestId("canvas-clear-circuit")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-template-menu-trigger")).toBeInTheDocument();
  });
});
