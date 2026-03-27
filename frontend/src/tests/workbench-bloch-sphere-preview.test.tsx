import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import CircuitWorkbenchPage from "../pages/CircuitWorkbenchPage";

describe("CircuitWorkbenchPage Bloch sphere preview", () => {
  it("renders a split result layout with a Bloch panel and qubit selector for multi-qubit circuits", async () => {
    render(
      <MemoryRouter>
        <CircuitWorkbenchPage
          scheduler={
            {
              schedule: async () => ({
                requestId: "sim-bloch",
                probabilities: { "00": 0.5, "11": 0.5 },
                blochVectors: [
                  { x: 0, y: 0, z: 0 },
                  { x: 0, y: 0, z: 0 },
                ],
              }),
            } as never
          }
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("workbench-result-layout")).toBeInTheDocument();
    });

    expect(screen.getByTestId("workbench-result-layout")).toHaveClass("workbench-result-panel__layout");
    expect(screen.getByTestId("workbench-bloch-panel")).toBeInTheDocument();
    expect(screen.getByTestId("workbench-bloch-qubit-selector")).toBeInTheDocument();
    expect(screen.getByTestId("bloch-sphere-3d-shell")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "q0" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "q1" })).toBeInTheDocument();
  });
});
