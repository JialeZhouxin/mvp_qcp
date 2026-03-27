import { fireEvent, render, screen, within } from "@testing-library/react";

import { readFileSync } from "node:fs";
import path from "node:path";

import CircuitCanvas from "../features/circuit/components/CircuitCanvas";
import type { CircuitModel } from "../features/circuit/model/types";

const GATE_DRAG_MIME = "application/x-qcp-gate";

const createGateDragData = (gate: string) => ({
  types: [GATE_DRAG_MIME],
  getData: (type: string) => (type === GATE_DRAG_MIME ? gate : ""),
});

describe("CircuitCanvas", () => {
  it("adds gate when dropped into cell", () => {
    const model: CircuitModel = { numQubits: 1, operations: [] };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    const cell = screen.getByTestId("canvas-cell-0-0");
    fireEvent.drop(cell, {
      dataTransfer: {
        getData: () => "x",
      },
    });

    expect(onCircuitChange).toHaveBeenCalledTimes(1);
    const nextModel = onCircuitChange.mock.calls[0][0] as CircuitModel;
    expect(nextModel.operations[0].gate).toBe("x");
    expect(nextModel.operations[0].targets).toEqual([0]);
  });

  it("shows drag preview feedback for droppable and occupied cells", () => {
    const model: CircuitModel = {
      numQubits: 2,
      operations: [{ id: "op-1", gate: "x", targets: [0], layer: 0 }],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    const occupiedCell = screen.getByTestId("canvas-cell-0-0");
    const droppableCell = screen.getByTestId("canvas-cell-1-0");

    fireEvent.dragEnter(droppableCell, {
      dataTransfer: createGateDragData("h"),
    });
    fireEvent.dragOver(droppableCell, {
      dataTransfer: createGateDragData("h"),
    });

    expect(droppableCell).toHaveClass("canvas-cell--drop-target");
    expect(droppableCell).toHaveClass("canvas-cell--drop-hover");
    expect(occupiedCell).toHaveClass("canvas-cell--blocked");

    fireEvent.drop(droppableCell, {
      dataTransfer: createGateDragData("h"),
    });

    expect(droppableCell).not.toHaveClass("canvas-cell--drop-target");
    expect(droppableCell).not.toHaveClass("canvas-cell--drop-hover");
    expect(occupiedCell).not.toHaveClass("canvas-cell--blocked");
  });

  it("removes operation when delete button clicked", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "op-1", gate: "x", targets: [0], layer: 0 }],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    const gateText = screen.getByText("X");
    expect(gateText).toHaveClass("canvas-gate-text-line");
    expect(gateText.closest(".canvas-gate-text")).toHaveClass("canvas-gate-text");
    expect(gateText.closest(".canvas-gate-box")).toHaveClass("canvas-gate-box");

    const removeButton = screen.getByTestId("remove-op-op-1");
    expect(removeButton).toHaveTextContent("\u00d7");
    expect(removeButton).toHaveAttribute("aria-label", "\u5220\u9664 gate");

    fireEvent.click(removeButton);
    expect(onCircuitChange).toHaveBeenCalledTimes(1);
    const nextModel = onCircuitChange.mock.calls[0][0] as CircuitModel;
    expect(nextModel.operations).toHaveLength(0);
  });

  it("renders symbolic controlled gates and connector lines", () => {
    const model: CircuitModel = {
      numQubits: 4,
      operations: [
        { id: "op-x", gate: "x", targets: [0], layer: 0 },
        { id: "op-cx", gate: "cx", controls: [0], targets: [1], layer: 1 },
        { id: "op-cz", gate: "cz", controls: [0], targets: [2], layer: 2 },
        { id: "op-ccx", gate: "ccx", controls: [0, 1], targets: [3], layer: 3 },
        { id: "op-swap", gate: "swap", targets: [0, 2], layer: 4 },
        { id: "op-cp", gate: "cp", controls: [3], targets: [1], params: [0.4], layer: 5 },
        { id: "op-m", gate: "m", targets: [2], layer: 6 },
      ],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={7} />);

    const singleGate = screen.getByText("X");
    const measurementGate = screen.getByText("M");
    const cxControlCell = screen.getByTestId("canvas-cell-0-1");
    const cxTargetCell = screen.getByTestId("canvas-cell-1-1");
    const czTargetCell = screen.getByTestId("canvas-cell-2-2");
    const ccxControlCell = screen.getByTestId("canvas-cell-1-3");
    const ccxTargetCell = screen.getByTestId("canvas-cell-3-3");
    const swapStartCell = screen.getByTestId("canvas-cell-0-4");
    const swapEndCell = screen.getByTestId("canvas-cell-2-4");
    const swapTitle = "SWAP q0 <-> q2 (swap endpoint)";
    const cpTargetCell = screen.getByTestId("canvas-cell-1-5");
    const cpControlCell = screen.getByTestId("canvas-cell-3-5");

    expect(singleGate.closest(".canvas-gate-box")).toHaveClass("canvas-gate-box--single");
    expect(measurementGate.closest(".canvas-gate-box")).toHaveClass("canvas-gate-box--measurement");
    expect(cxControlCell.querySelector(".canvas-gate-box--symbol-control")).toBeInTheDocument();
    expect(cxTargetCell.querySelector(".canvas-gate-box--symbol-target-x")).toBeInTheDocument();
    expect(cxTargetCell.querySelector(".canvas-gate-box--symbol-target-x")).not.toHaveClass(
      "canvas-gate-box--multi",
    );
    expect(czTargetCell.querySelector(".canvas-gate-box--symbol-target-z")).toBeInTheDocument();
    expect(ccxControlCell.querySelector(".canvas-gate-box--symbol-control")).toBeInTheDocument();
    expect(ccxTargetCell.querySelector(".canvas-gate-box--symbol-target-x")).toBeInTheDocument();
    expect(within(swapStartCell).getByTitle(swapTitle)).toHaveClass("canvas-gate-box--symbol-swap");
    expect(within(swapEndCell).getByTitle(swapTitle)).toHaveClass("canvas-gate-box--symbol-swap");
    expect(within(cpTargetCell).getByText("P(0.40)").closest(".canvas-gate-box")).toHaveClass(
      "canvas-gate-box--symbol-target-p",
    );
    expect(cpControlCell.querySelector(".canvas-gate-box--symbol-control")).toBeInTheDocument();

    expect(screen.getByTestId("canvas-cell-1-2")).toHaveClass("canvas-cell--connector-middle");
    expect(screen.getByTestId("canvas-cell-1-4")).toHaveClass("canvas-cell--connector-middle");
    expect(screen.getByTestId("canvas-cell-2-5")).toHaveClass("canvas-cell--connector-middle");
    expect(cpTargetCell).toHaveClass("canvas-cell--connector-start");
    expect(cpControlCell).toHaveClass("canvas-cell--connector-end");

    expect(cxTargetCell.querySelector(".canvas-gate-box--symbol-target-x")).toHaveAttribute(
      "title",
      expect.stringContaining("CX c0 -> t1"),
    );
    expect(screen.queryByText("CX")).not.toBeInTheDocument();
  });

  it("renders one row-level wire for each qubit row", () => {
    const model: CircuitModel = {
      numQubits: 3,
      operations: [{ id: "op-1", gate: "h", targets: [1], layer: 1 }],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={3} />);

    const wires = screen.getAllByTestId(/canvas-row-wire-/);
    expect(wires).toHaveLength(3);
    expect(within(screen.getByTestId("canvas-row-track-0")).getByTestId("canvas-row-wire-0")).toBeInTheDocument();
    expect(within(screen.getByTestId("canvas-row-track-1")).getByTestId("canvas-row-wire-1")).toBeInTheDocument();
    expect(within(screen.getByTestId("canvas-row-track-2")).getByTestId("canvas-row-wire-2")).toBeInTheDocument();
  });

  it("deletes selected operation when Delete key is pressed", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "op-1", gate: "x", targets: [0], layer: 0 }],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    fireEvent.click(screen.getByTestId("canvas-cell-0-0"));
    fireEvent.keyDown(window, { key: "Delete" });

    expect(onCircuitChange).toHaveBeenCalledTimes(1);
    const nextModel = onCircuitChange.mock.calls[0][0] as CircuitModel;
    expect(nextModel.operations).toHaveLength(0);
  });

  it("does not delete operation when no gate is selected", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "op-1", gate: "x", targets: [0], layer: 0 }],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    fireEvent.keyDown(window, { key: "Delete" });

    expect(onCircuitChange).not.toHaveBeenCalled();
  });

  it("calls undo and redo callbacks when shortcut is pressed", () => {
    const model: CircuitModel = { numQubits: 1, operations: [] };
    const onCircuitChange = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    render(
      <CircuitCanvas
        circuit={model}
        onCircuitChange={onCircuitChange}
        minLayers={2}
        onUndo={onUndo}
        onRedo={onRedo}
      />,
    );

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    fireEvent.keyDown(window, { key: "z", metaKey: true, shiftKey: true });

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(2);
  });

  it("renders workbench controls inside canvas and triggers callbacks", () => {
    const model: CircuitModel = { numQubits: 3, operations: [] };
    const onCircuitChange = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onIncreaseQubits = vi.fn();
    const onDecreaseQubits = vi.fn();
    const onClearCircuit = vi.fn();
    const onResetWorkbench = vi.fn();
    const onLoadTemplate = vi.fn();

    render(
      <CircuitCanvas
        circuit={model}
        onCircuitChange={onCircuitChange}
        minLayers={2}
        onUndo={onUndo}
        onRedo={onRedo}
        controls={{
          canUndo: true,
          canRedo: true,
          currentQubits: 3,
          canIncreaseQubits: true,
          canDecreaseQubits: true,
          qubitMessage: "Qubit test warning",
          onIncreaseQubits,
          onDecreaseQubits,
          onClearCircuit,
          onResetWorkbench,
          onLoadTemplate,
        }}
      />,
    );

    const toolbar = screen.getByTestId("canvas-workbench-toolbar");
    const toolbarTop = screen.getByTestId("canvas-workbench-topbar");
    const viewport = screen.getByTestId("canvas-viewport");
    const isBeforeViewport = Boolean(
      toolbar.compareDocumentPosition(viewport) & Node.DOCUMENT_POSITION_FOLLOWING,
    );

    expect(toolbar).toContainElement(toolbarTop);
    expect(screen.getByTestId("canvas-workbench-left")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-workbench-center")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-workbench-right")).toBeInTheDocument();

    const actionButtons = within(screen.getByTestId("canvas-workbench-actions")).getAllByRole("button");
    fireEvent.click(actionButtons[0]);
    fireEvent.click(actionButtons[1]);
    fireEvent.click(actionButtons[2]);
    fireEvent.click(actionButtons[3]);

    const qubitButtons = within(screen.getByTestId("canvas-workbench-qubits")).getAllByRole("button");
    fireEvent.click(qubitButtons[0]);
    fireEvent.click(qubitButtons[1]);

    const templateMenu = screen.getByTestId("canvas-template-menu-trigger");
    fireEvent.click(templateMenu);
    fireEvent.click(screen.getByTestId("canvas-template-option-bell"));
    fireEvent.click(templateMenu);
    fireEvent.click(screen.getByTestId("canvas-template-option-superposition"));

    expect(isBeforeViewport).toBe(true);
    expect(screen.getByTestId("canvas-qubit-count")).toHaveTextContent("3");
    expect(screen.getByTestId("qubit-message")).toHaveTextContent("Qubit test warning");
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(onClearCircuit).toHaveBeenCalledTimes(1);
    expect(onResetWorkbench).toHaveBeenCalledTimes(1);
    expect(onIncreaseQubits).toHaveBeenCalledTimes(1);
    expect(onDecreaseQubits).toHaveBeenCalledTimes(1);
    expect(onLoadTemplate).toHaveBeenNthCalledWith(1, "bell");
    expect(onLoadTemplate).toHaveBeenNthCalledWith(2, "superposition");
  });

  it("ignores canvas shortcuts when focus is in editable element", () => {
    const model: CircuitModel = { numQubits: 1, operations: [] };
    const onCircuitChange = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    render(
      <CircuitCanvas
        circuit={model}
        onCircuitChange={onCircuitChange}
        minLayers={2}
        onUndo={onUndo}
        onRedo={onRedo}
      />,
    );

    const input = document.createElement("textarea");
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    fireEvent.keyDown(input, { key: "y", ctrlKey: true });
    fireEvent.keyDown(input, { key: "Delete" });
    input.remove();

    expect(onUndo).not.toHaveBeenCalled();
    expect(onRedo).not.toHaveBeenCalled();
    expect(onCircuitChange).not.toHaveBeenCalled();
  });

  it("renders zoom controls and updates zoom percentage", () => {
    const model: CircuitModel = { numQubits: 2, operations: [] };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    const zoomInButton = screen.getByTestId("canvas-zoom-in");
    const zoomOutButton = screen.getByTestId("canvas-zoom-out");
    const zoomResetButton = screen.getByTestId("canvas-zoom-reset");
    const zoomPercent = screen.getByTestId("canvas-zoom-percent");
    const zoomToolbar = screen.getByTestId("canvas-zoom-toolbar");

    expect(zoomToolbar).toHaveClass("canvas-workbench-toolbar-cluster");
    expect(zoomPercent).toHaveTextContent("100%");
    fireEvent.click(zoomInButton);
    expect(zoomPercent).toHaveTextContent("110%");
    fireEvent.click(zoomResetButton);
    expect(zoomPercent).toHaveTextContent("100%");

    for (let i = 0; i < 20; i += 1) {
      fireEvent.click(zoomOutButton);
    }
    expect(zoomPercent).toHaveTextContent("50%");
    expect(zoomOutButton).toBeDisabled();
  });

  it("does not locally reset the canvas scale variable on the grid root", () => {
    const cssPath = path.resolve(
      import.meta.dirname,
      "../features/circuit/components/CircuitCanvas.css",
    );
    const cssSource = readFileSync(cssPath, "utf8");
    const gridRuleMatch = cssSource.match(/\.canvas-grid\s*\{([\s\S]*?)\}/);

    expect(gridRuleMatch?.[1]).toBeDefined();
    expect(gridRuleMatch?.[1]).not.toMatch(/--canvas-scale\s*:/);
  });

  it("supports zoom by wheel and keyboard shortcuts", () => {
    const model: CircuitModel = { numQubits: 2, operations: [] };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    const viewport = screen.getByTestId("canvas-viewport");
    const zoomPercent = screen.getByTestId("canvas-zoom-percent");

    fireEvent.wheel(viewport, { deltaY: -120, ctrlKey: true, clientX: 120, clientY: 120 });
    expect(zoomPercent).toHaveTextContent("110%");

    fireEvent.wheel(viewport, { deltaY: -120, clientX: 120, clientY: 120 });
    expect(zoomPercent).toHaveTextContent("110%");

    fireEvent.keyDown(window, { key: "-", ctrlKey: true });
    expect(zoomPercent).toHaveTextContent("100%");

    fireEvent.keyDown(window, { key: "=", ctrlKey: true });
    expect(zoomPercent).toHaveTextContent("110%");

    fireEvent.keyDown(window, { key: "0", ctrlKey: true });
    expect(zoomPercent).toHaveTextContent("100%");
  });

  it("renders time step control on a dedicated bottom row", () => {
    const model: CircuitModel = { numQubits: 2, operations: [] };
    const onCircuitChange = vi.fn();
    const onSimulationStepChange = vi.fn();

    render(
      <CircuitCanvas
        circuit={model}
        onCircuitChange={onCircuitChange}
        minLayers={2}
        simulationStep={1}
        totalSimulationSteps={4}
        onSimulationStepChange={onSimulationStepChange}
      />,
    );

    const toolbar = screen.getByTestId("canvas-workbench-toolbar");
    const timeline = screen.getByTestId("canvas-workbench-timeline");
    const slider = screen.getByTestId("canvas-time-step-slider");

    expect(toolbar).toContainElement(timeline);
    expect(timeline).toContainElement(slider);
    expect(screen.getByTestId("canvas-time-step-value")).toHaveTextContent("1 / 4");

    fireEvent.change(slider, { target: { value: "3" } });
    expect(onSimulationStepChange).toHaveBeenCalledWith(3);
  });

  it("ignores zoom shortcuts when focus is in editable element", () => {
    const model: CircuitModel = { numQubits: 2, operations: [] };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    const zoomPercent = screen.getByTestId("canvas-zoom-percent");
    const input = document.createElement("textarea");
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: "=", ctrlKey: true });
    input.remove();

    expect(zoomPercent).toHaveTextContent("100%");
  });

  it("toggles pan-ready state when Space is pressed", () => {
    const model: CircuitModel = { numQubits: 2, operations: [] };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={20} />);

    const viewport = screen.getByTestId("canvas-viewport");

    fireEvent.keyDown(window, { code: "Space", key: " " });
    expect(viewport).toHaveClass("canvas-viewport--pan-ready");

    fireEvent.keyUp(window, { code: "Space", key: " " });
    expect(viewport).not.toHaveClass("canvas-viewport--pan-ready");
  });

  it("blocks drop when cell is already occupied", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "op-1", gate: "x", targets: [0], layer: 0 }],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    const cell = screen.getByTestId("canvas-cell-0-0");
    fireEvent.drop(cell, {
      dataTransfer: {
        getData: () => "h",
      },
    });

    expect(onCircuitChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("canvas-message")).toBeInTheDocument();

  });

  it("places two-qubit gate in two steps", () => {
    const model: CircuitModel = { numQubits: 2, operations: [] };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    fireEvent.drop(screen.getByTestId("canvas-cell-0-0"), {
      dataTransfer: {
        getData: () => "cx",
      },
    });
    expect(onCircuitChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("canvas-message")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("canvas-cell-1-0"));
    expect(onCircuitChange).toHaveBeenCalledTimes(1);
    const nextModel = onCircuitChange.mock.calls[0][0] as CircuitModel;
    expect(nextModel.operations[0].gate).toBe("cx");
    expect(nextModel.operations[0].controls).toEqual([0]);
    expect(nextModel.operations[0].targets).toEqual([1]);
  });

  it("places cp gate in two steps with default lambda parameter", () => {
    const model: CircuitModel = { numQubits: 2, operations: [] };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    fireEvent.drop(screen.getByTestId("canvas-cell-0-0"), {
      dataTransfer: {
        getData: () => "cp",
      },
    });
    fireEvent.click(screen.getByTestId("canvas-cell-1-0"));

    expect(onCircuitChange).toHaveBeenCalledTimes(1);
    const nextModel = onCircuitChange.mock.calls[0][0] as CircuitModel;
    expect(nextModel.operations[0].gate).toBe("cp");
    expect(nextModel.operations[0].controls).toEqual([0]);
    expect(nextModel.operations[0].targets).toEqual([1]);
    expect(nextModel.operations[0].params).toEqual([0]);
  });

  it("places ccx gate in three steps", () => {
    const model: CircuitModel = { numQubits: 3, operations: [] };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    fireEvent.drop(screen.getByTestId("canvas-cell-0-0"), {
      dataTransfer: {
        getData: () => "ccx",
      },
    });
    fireEvent.click(screen.getByTestId("canvas-cell-1-0"));
    expect(onCircuitChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("canvas-cell-2-0"));

    expect(onCircuitChange).toHaveBeenCalledTimes(1);
    const nextModel = onCircuitChange.mock.calls[0][0] as CircuitModel;
    expect(nextModel.operations[0].gate).toBe("ccx");
    expect(nextModel.operations[0].controls).toEqual([0, 1]);
    expect(nextModel.operations[0].targets).toEqual([2]);
  });

  it("shows actionable guidance when two-qubit second step uses invalid layer", () => {
    const model: CircuitModel = { numQubits: 2, operations: [] };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    fireEvent.drop(screen.getByTestId("canvas-cell-0-0"), {
      dataTransfer: {
        getData: () => "cx",
      },
    });
    fireEvent.click(screen.getByTestId("canvas-cell-1-1"));

    expect(onCircuitChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("canvas-message")).toBeInTheDocument();

  });

  it("updates parameter value from panel for parameterized gate", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "op-rx", gate: "rx", targets: [0], layer: 0, params: [0] }],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    fireEvent.click(screen.getByTestId("canvas-cell-0-0"));
    const sidePanel = screen.getByTestId("operation-params-panel");
    fireEvent.change(within(sidePanel).getByLabelText("param-theta"), {
      target: { value: "1.57" },
    });

    expect(onCircuitChange).toHaveBeenCalledTimes(1);
    const nextModel = onCircuitChange.mock.calls[0][0] as CircuitModel;
    expect(nextModel.operations[0].params?.[0]).toBeCloseTo(1.57, 6);
  });
  it("renders parameter values directly on parameterized gate labels", () => {
    const model: CircuitModel = {
      numQubits: 2,
      operations: [
        { id: "op-rx", gate: "rx", targets: [0], layer: 0, params: [1.234] },
        { id: "op-u", gate: "u", targets: [1], layer: 0, params: [1, 0, Math.PI] },
        { id: "op-p", gate: "p", targets: [0], layer: 1, params: [0.4] },
        { id: "op-cp", gate: "cp", controls: [0], targets: [1], layer: 1, params: [0.25] },
      ],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={3} />);

    const rxCell = screen.getByTestId("canvas-cell-0-0");
    const uCell = screen.getByTestId("canvas-cell-1-0");
    const pCell = screen.getByTestId("canvas-cell-0-1");
    const cpTargetCell = screen.getByTestId("canvas-cell-1-1");

    expect(within(rxCell).getByText("RX")).toBeInTheDocument();
    expect(within(rxCell).getByText("(1.23)")).toBeInTheDocument();
    expect(within(uCell).getByText("U")).toBeInTheDocument();
    expect(within(uCell).getByText("(1.00,0.00,3.14)")).toBeInTheDocument();
    expect(within(pCell).getByText("P")).toBeInTheDocument();
    expect(within(pCell).getByText("(0.40)")).toBeInTheDocument();
    expect(within(screen.getByTestId("canvas-cell-1-1")).getByText("P(0.25)")).toBeInTheDocument();
    expect(within(rxCell).getByText("RX").closest(".canvas-gate-text")).toHaveClass(
      "canvas-gate-text--stacked",
    );
    expect(cpTargetCell.querySelector(".canvas-gate-box--symbol-target-p")).toBeInTheDocument();
  });

  it("uses compact cell width per layer based on gate body width", () => {
    const model: CircuitModel = {
      numQubits: 2,
      operations: [
        { id: "op-x", gate: "x", targets: [0], layer: 0 },
        { id: "op-u", gate: "u", targets: [1], layer: 1, params: [1, 0, Math.PI] },
        { id: "op-cx", gate: "cx", controls: [0], targets: [1], layer: 2 },
      ],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={4} />);

    expect(screen.getByTestId("canvas-cell-0-0")).toHaveStyle("--canvas-cell-width: 40px");
    expect(screen.getByTestId("canvas-cell-1-0")).toHaveStyle("--canvas-cell-width: 40px");
    expect(screen.getByTestId("canvas-cell-0-1")).toHaveStyle("--canvas-cell-width: 62px");
    expect(screen.getByTestId("canvas-cell-1-1")).toHaveStyle("--canvas-cell-width: 62px");
    expect(screen.getByTestId("canvas-cell-0-2")).toHaveStyle("--canvas-cell-width: 40px");
    expect(screen.getByTestId("canvas-cell-1-2")).toHaveStyle("--canvas-cell-width: 40px");
  });

  it("shows inline parameter editor for selected parameterized gate", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "op-rx", gate: "rx", targets: [0], layer: 0, params: [0] }],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    fireEvent.click(screen.getByTestId("canvas-cell-0-0"));

    expect(screen.getByTestId("inline-operation-params-panel")).toBeInTheDocument();
    expect(screen.getByTestId("operation-params-panel")).toBeInTheDocument();
  });

  it("keeps inline editor and side panel parameter values in sync", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "op-rx", gate: "rx", targets: [0], layer: 0, params: [0] }],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    fireEvent.click(screen.getByTestId("canvas-cell-0-0"));
    const inlinePanel = screen.getByTestId("inline-operation-params-panel");
    const sidePanel = screen.getByTestId("operation-params-panel");

    fireEvent.change(within(inlinePanel).getByLabelText("param-theta"), {
      target: { value: "1.2" },
    });

    expect(onCircuitChange).toHaveBeenCalledTimes(1);
    const sideInput = within(sidePanel).getByLabelText("param-theta") as HTMLInputElement;
    expect(sideInput.value).toBe("1.2");
  });

  it("shows soft boundary warning and supports normalize action", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "op-rx", gate: "rx", targets: [0], layer: 0, params: [0] }],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    fireEvent.click(screen.getByTestId("canvas-cell-0-0"));
    const inlinePanel = screen.getByTestId("inline-operation-params-panel");

    fireEvent.change(within(inlinePanel).getByLabelText("param-theta"), {
      target: { value: "20" },
    });

    expect(onCircuitChange).toHaveBeenCalledTimes(1);
    expect(within(inlinePanel).getByTestId("param-warning-0")).toBeInTheDocument();

    fireEvent.click(within(inlinePanel).getByTestId("param-normalize-0"));
    expect(onCircuitChange).toHaveBeenCalledTimes(2);
    const normalizedModel = onCircuitChange.mock.calls[1][0] as CircuitModel;
    expect(normalizedModel.operations[0].params?.[0]).toBeGreaterThan(-6.3);
    expect(normalizedModel.operations[0].params?.[0]).toBeLessThan(6.3);
  });

  it("blocks non-finite parameter input and keeps previous value", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "op-rx", gate: "rx", targets: [0], layer: 0, params: [0.5] }],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    fireEvent.click(screen.getByTestId("canvas-cell-0-0"));
    const inlinePanel = screen.getByTestId("inline-operation-params-panel");
    fireEvent.change(within(inlinePanel).getByLabelText("param-theta"), {
      target: { value: "" },
    });

    expect(onCircuitChange).not.toHaveBeenCalled();
    expect(within(inlinePanel).getByTestId("param-error-0")).toBeInTheDocument();
  });
});


