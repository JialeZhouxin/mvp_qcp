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

    const submitRail = await screen.findByTestId("workbench-submit-rail");
    const submitPanel = await screen.findByTestId("workbench-submit-panel");
    const primaryLayout = await screen.findByTestId("workbench-primary-layout");
    const canvasPanel = await screen.findByTestId("circuit-canvas-panel");
    const canvasToolbar = await screen.findByTestId("canvas-workbench-toolbar");

    expect(submitRail).toContainElement(submitPanel);
    expect(isBefore(submitRail, primaryLayout)).toBe(true);
    expect(submitRail).toHaveStyle({ position: "sticky" });
    expect(submitRail).toHaveStyle({ top: "12px" });
    expect(canvasPanel).toContainElement(canvasToolbar);
    expect(screen.getByRole("button", { name: "清空电路" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bell 态" })).toBeInTheDocument();
  });
});
