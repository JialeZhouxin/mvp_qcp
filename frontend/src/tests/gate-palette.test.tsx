import { fireEvent, render, screen, within } from "@testing-library/react";

import GatePalette from "../features/circuit/components/GatePalette";

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

  it("shows compact chinese tooltip with katex rendering on hover and focus", () => {
    render(<GatePalette />);

    const cpButton = screen.getByTestId("gate-cp");
    fireEvent.mouseEnter(cpButton);
    const hoveredTooltip = screen.getByTestId("gate-matrix-tooltip-cp");
    expect(hoveredTooltip).toBeInTheDocument();
    expect(within(hoveredTooltip).getByText("CP 受控相位门")).toBeInTheDocument();
    expect(hoveredTooltip).toHaveTextContent("受控相位门，按条件施加相位旋转。");
    expect(hoveredTooltip).toHaveTextContent("作用于 2 个量子比特");
    expect(hoveredTooltip.querySelector(".katex")).not.toBeNull();
    expect(hoveredTooltip).not.toHaveTextContent("CP(lambda)");
    expect(hoveredTooltip).not.toHaveTextContent("exp(i*lambda)");

    fireEvent.mouseLeave(cpButton);
    expect(screen.queryByTestId("gate-matrix-tooltip-cp")).not.toBeInTheDocument();

    fireEvent.focus(cpButton);
    expect(screen.getByTestId("gate-matrix-tooltip-cp")).toBeInTheDocument();
    fireEvent.blur(cpButton);
    expect(screen.queryByTestId("gate-matrix-tooltip-cp")).not.toBeInTheDocument();
  });

  it("suppresses tooltip strictly during drag and allows re-hover after drag end", () => {
    render(<GatePalette />);

    const panel = screen.getByTestId("gate-palette-panel");
    const cpButton = screen.getByTestId("gate-cp");
    const hButton = screen.getByTestId("gate-h");

    fireEvent.mouseEnter(cpButton);
    expect(screen.getByTestId("gate-matrix-tooltip-cp")).toBeInTheDocument();

    fireEvent.dragStart(cpButton);
    expect(screen.queryByTestId("gate-matrix-tooltip-cp")).not.toBeInTheDocument();

    fireEvent.mouseEnter(hButton);
    expect(screen.queryByTestId("gate-matrix-tooltip-h")).not.toBeInTheDocument();

    fireEvent.dragEnd(cpButton);
    expect(screen.queryByTestId("gate-matrix-tooltip-cp")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gate-matrix-tooltip-h")).not.toBeInTheDocument();

    fireEvent.mouseEnter(hButton);
    expect(screen.getByTestId("gate-matrix-tooltip-h")).toBeInTheDocument();

    fireEvent.dragStart(hButton);
    fireEvent.drop(panel);
    expect(screen.queryByTestId("gate-matrix-tooltip-h")).not.toBeInTheDocument();

    fireEvent.mouseEnter(cpButton);
    expect(screen.getByTestId("gate-matrix-tooltip-cp")).toBeInTheDocument();
  });
});


