import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import CircuitWorkbenchPage from "../pages/CircuitWorkbenchPage";
import { WORKBENCH_COPY } from "../features/circuit/ui/copy-catalog";

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

    const submitRail = await screen.findByTestId("workbench-submit-rail");
    const submitPanel = await screen.findByTestId("workbench-submit-panel");
    const primaryLayout = await screen.findByTestId("workbench-primary-layout");
    const canvasPanel = await screen.findByTestId("circuit-canvas-panel");
    const canvasToolbar = await screen.findByTestId("canvas-workbench-toolbar");
    const viewportShell = await screen.findByTestId("canvas-viewport-shell");

    expect(submitRail).toContainElement(submitPanel);
    expect(isBefore(submitRail, primaryLayout)).toBe(true);
    expect(submitRail).toHaveStyle({ position: "sticky" });
    expect(submitRail).toHaveStyle({ top: "12px" });
    expect(canvasPanel).toContainElement(canvasToolbar);
    expect(canvasPanel).toContainElement(viewportShell);
    expect(screen.getByRole("button", { name: WORKBENCH_COPY.toolbar.clearCircuit })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: WORKBENCH_COPY.toolbar.bellTemplate })).toBeInTheDocument();
  });
});
