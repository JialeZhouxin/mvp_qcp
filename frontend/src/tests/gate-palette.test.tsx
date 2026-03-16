import { fireEvent, render, screen, within } from "@testing-library/react";

import GatePalette from "../components/circuit/GatePalette";

describe("GatePalette", () => {
  it("renders gates in category order without section titles", () => {
    render(<GatePalette />);

    const panel = screen.getByTestId("gate-palette-panel");
    expect(within(panel).queryByRole("heading", { level: 4 })).not.toBeInTheDocument();

    const gateButtons = within(panel).getAllByRole("button");
    const buttonTestIds = gateButtons.map((button) => button.getAttribute("data-testid"));

    expect(buttonTestIds).toContain("gate-h");
    expect(buttonTestIds).toContain("gate-cx");
    expect(buttonTestIds).toContain("gate-cp");
    expect(buttonTestIds).toContain("gate-ccx");
    expect(buttonTestIds).toContain("gate-m");
    expect(buttonTestIds.indexOf("gate-h")).toBeLessThan(buttonTestIds.indexOf("gate-cx"));
    expect(buttonTestIds.indexOf("gate-cx")).toBeLessThan(buttonTestIds.indexOf("gate-m"));
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
