import { fireEvent, render, screen, within } from "@testing-library/react";

import GatePalette from "../features/circuit/components/GatePalette";

function createDataTransfer(): DataTransfer {
  return {
    clearData: vi.fn(),
    dropEffect: "none",
    effectAllowed: "all",
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
    getData: vi.fn(() => ""),
    setData: vi.fn(),
    setDragImage: vi.fn(),
  } as unknown as DataTransfer;
}

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

  it("renders gate buttons with shared workbench button styling and weak category accent", () => {
    render(<GatePalette />);

    const singleGate = screen.getByTestId("gate-h");
    const controlledGate = screen.getByTestId("gate-cx");
    const measurementGate = screen.getByTestId("gate-m");

    expect(singleGate).toHaveClass("workbench-control-button", "gate-palette-button");
    expect(controlledGate).toHaveClass("workbench-control-button", "gate-palette-button");
    expect(measurementGate).toHaveClass("workbench-control-button", "gate-palette-button");

    const singleAccent = within(singleGate).getByTestId("gate-accent-h");
    const controlledAccent = within(controlledGate).getByTestId("gate-accent-cx");
    const measurementAccent = within(measurementGate).getByTestId("gate-accent-m");

    expect(singleAccent).toHaveClass("gate-palette-button__accent", "gate-palette-button__accent--single");
    expect(controlledAccent).toHaveClass(
      "gate-palette-button__accent",
      "gate-palette-button__accent--controlled",
    );
    expect(measurementAccent).toHaveClass(
      "gate-palette-button__accent",
      "gate-palette-button__accent--measurement",
    );
  });

  it("shows compact Chinese tooltip on hover and focus for x gate", () => {
    render(<GatePalette />);

    const xButton = screen.getByTestId("gate-x");
    fireEvent.mouseEnter(xButton);
    const hoveredTooltip = screen.getByTestId("gate-matrix-tooltip-x");
    expect(hoveredTooltip).toBeInTheDocument();
    expect(within(hoveredTooltip).getByText("X 门")).toBeInTheDocument();
    expect(hoveredTooltip).toHaveTextContent("对量子比特执行比特翻转。");
    expect(hoveredTooltip).toHaveTextContent("作用于 1 个量子比特。");

    fireEvent.mouseLeave(xButton);
    expect(screen.queryByTestId("gate-matrix-tooltip-x")).not.toBeInTheDocument();

    fireEvent.focus(xButton);
    expect(screen.getByTestId("gate-matrix-tooltip-x")).toBeInTheDocument();
    fireEvent.blur(xButton);
    expect(screen.queryByTestId("gate-matrix-tooltip-x")).not.toBeInTheDocument();
  });

  it("hides tooltip immediately on drag start and keeps it suppressed until the pointer leaves and re-enters", () => {
    render(<GatePalette />);

    const xButton = screen.getByTestId("gate-x");
    fireEvent.mouseEnter(xButton);
    expect(screen.getByTestId("gate-matrix-tooltip-x")).toBeInTheDocument();

    fireEvent.dragStart(xButton, { dataTransfer: createDataTransfer() });
    expect(screen.queryByTestId("gate-matrix-tooltip-x")).not.toBeInTheDocument();

    fireEvent.dragEnd(xButton);
    expect(screen.queryByTestId("gate-matrix-tooltip-x")).not.toBeInTheDocument();

    fireEvent.mouseEnter(xButton);
    expect(screen.queryByTestId("gate-matrix-tooltip-x")).not.toBeInTheDocument();

    fireEvent.mouseLeave(xButton);
    fireEvent.mouseEnter(xButton);
    expect(screen.getByTestId("gate-matrix-tooltip-x")).toBeInTheDocument();
  });

  it("does not show any tooltip while dragging another gate", () => {
    render(<GatePalette />);

    const xButton = screen.getByTestId("gate-x");
    const hButton = screen.getByTestId("gate-h");

    fireEvent.dragStart(xButton, { dataTransfer: createDataTransfer() });
    fireEvent.mouseEnter(hButton);

    expect(screen.queryByTestId("gate-matrix-tooltip-x")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gate-matrix-tooltip-h")).not.toBeInTheDocument();
  });

  it("does not restore a previously focused gate tooltip after hovering another gate", () => {
    render(<GatePalette />);

    const zButton = screen.getByTestId("gate-z");
    const xButton = screen.getByTestId("gate-x");

    fireEvent.focus(zButton);
    expect(screen.getByTestId("gate-matrix-tooltip-z")).toBeInTheDocument();

    fireEvent.mouseEnter(xButton);
    expect(screen.getByTestId("gate-matrix-tooltip-x")).toBeInTheDocument();
    expect(screen.queryByTestId("gate-matrix-tooltip-z")).not.toBeInTheDocument();

    fireEvent.mouseLeave(xButton);
    expect(screen.queryByTestId("gate-matrix-tooltip-x")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gate-matrix-tooltip-z")).not.toBeInTheDocument();
  });
});
