import { render, screen, within } from "@testing-library/react";
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

    expect(submitRail).toContainElement(submitPanel);
    expect(isBefore(submitRail, primaryLayout)).toBe(true);
    expect(submitRail).toHaveStyle({ position: "sticky" });
    expect(submitRail).toHaveStyle({ top: "12px" });
    expect(canvasPanel).toContainElement(canvasToolbar);
    expect(screen.getByRole("button", { name: WORKBENCH_COPY.toolbar.clearCircuit })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: WORKBENCH_COPY.toolbar.bellTemplate })).toBeInTheDocument();

    const row1 = screen.getByTestId("canvas-workbench-row-1");
    const row2 = screen.getByTestId("canvas-workbench-row-2");
    const actionsGroup = screen.getByTestId("canvas-workbench-actions");
    const executionGatesGroup = screen.getByTestId("canvas-workbench-execution-gates");
    const qubitsGroup = screen.getByTestId("canvas-workbench-qubits");
    const templatesGroup = screen.getByTestId("canvas-workbench-templates");
    const zoomGroup = screen.getByTestId("canvas-zoom-toolbar");

    expect(row1).toContainElement(actionsGroup);
    expect(row1).toContainElement(executionGatesGroup);

    expect(row2).toContainElement(qubitsGroup);
    expect(row2).toContainElement(templatesGroup);
    expect(row2).toContainElement(zoomGroup);

    const executionSlider = within(executionGatesGroup).getByTestId("canvas-execution-gate-count-slider");
    expect(executionSlider).toBeInTheDocument();
  });
});

