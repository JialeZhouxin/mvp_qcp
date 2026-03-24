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
});
