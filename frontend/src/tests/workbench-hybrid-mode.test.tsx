import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import CircuitWorkbenchPage from "../pages/CircuitWorkbenchPage";

describe("Circuit workbench hybrid mode", () => {
  it("switches from single-run mode to hybrid mode and renders hybrid controls", async () => {
    render(
      <MemoryRouter>
        <CircuitWorkbenchPage />
      </MemoryRouter>,
    );

    const modeToggle = await screen.findByTestId("workbench-mode-toggle");
    expect(screen.queryByTestId("workbench-hybrid-panel")).not.toBeInTheDocument();

    fireEvent.click(modeToggle);

    expect(await screen.findByTestId("workbench-hybrid-panel")).toBeInTheDocument();
    expect(screen.getByTestId("hybrid-max-iterations-input")).toBeInTheDocument();
    expect(screen.getByTestId("hybrid-step-size-input")).toBeInTheDocument();
    expect(screen.getByTestId("hybrid-tolerance-input")).toBeInTheDocument();
    expect(screen.getByTestId("hybrid-convergence-empty")).toHaveTextContent("提交后将展示每轮目标值变化");
    expect(screen.queryByTestId("hybrid-convergence-scroll-container")).not.toBeInTheDocument();
  });
});
