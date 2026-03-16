import { fireEvent, render, screen, within } from "@testing-library/react";

import GatePalette from "../components/circuit/GatePalette";

describe("GatePalette", () => {
  it("renders grouped categories in deterministic order", () => {
    render(<GatePalette />);

    const headings = screen.getAllByRole("heading", { level: 4 });
    expect(headings).toHaveLength(3);

    expect(within(headings[0].parentElement as HTMLElement).getByTestId("gate-h")).toBeInTheDocument();
    expect(within(headings[1].parentElement as HTMLElement).getByTestId("gate-cx")).toBeInTheDocument();
    expect(within(headings[1].parentElement as HTMLElement).getByTestId("gate-cp")).toBeInTheDocument();
    expect(within(headings[1].parentElement as HTMLElement).getByTestId("gate-ccx")).toBeInTheDocument();
    expect(within(headings[2].parentElement as HTMLElement).getByTestId("gate-m")).toBeInTheDocument();
  });

  it("applies category color token to gate buttons", () => {
    render(<GatePalette />);

    expect(screen.getByTestId("gate-h")).toHaveStyle({
      color: "rgb(29, 78, 216)",
      borderColor: "rgb(29, 78, 216)",
    });
    expect(screen.getByTestId("gate-cx")).toHaveStyle({
      color: "rgb(21, 128, 61)",
      borderColor: "rgb(21, 128, 61)",
    });
    expect(screen.getByTestId("gate-m")).toHaveStyle({
      color: "rgb(75, 85, 99)",
      borderColor: "rgb(75, 85, 99)",
    });
  });

  it("shows matrix tooltip on hover and focus for cp gate", () => {
    render(<GatePalette />);

    const cpButton = screen.getByTestId("gate-cp");
    fireEvent.mouseEnter(cpButton);
    const hoveredTooltip = screen.getByTestId("gate-matrix-tooltip-cp");
    expect(hoveredTooltip).toBeInTheDocument();
    expect(within(hoveredTooltip).getByText("CP(lambda)")).toBeInTheDocument();
    expect(hoveredTooltip).toHaveTextContent("exp(i*lambda)");

    fireEvent.mouseLeave(cpButton);
    expect(screen.queryByTestId("gate-matrix-tooltip-cp")).not.toBeInTheDocument();

    fireEvent.focus(cpButton);
    expect(screen.getByTestId("gate-matrix-tooltip-cp")).toBeInTheDocument();
    fireEvent.blur(cpButton);
    expect(screen.queryByTestId("gate-matrix-tooltip-cp")).not.toBeInTheDocument();
  });
});
