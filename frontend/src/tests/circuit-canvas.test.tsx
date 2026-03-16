import { fireEvent, render, screen } from "@testing-library/react";

import CircuitCanvas from "../components/circuit/CircuitCanvas";
import type { CircuitModel } from "../features/circuit/model/types";

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

  it("removes operation when delete button clicked", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "op-1", gate: "x", targets: [0], layer: 0 }],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    fireEvent.click(screen.getByTestId("remove-op-op-1"));
    expect(onCircuitChange).toHaveBeenCalledTimes(1);
    const nextModel = onCircuitChange.mock.calls[0][0] as CircuitModel;
    expect(nextModel.operations).toHaveLength(0);
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
    expect(screen.getByTestId("canvas-message")).toHaveTextContent("无法放置量子门");
    expect(screen.getByTestId("canvas-message")).toHaveTextContent("已存在操作");
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
    expect(screen.getByTestId("canvas-message")).toHaveTextContent("等待选择目标量子位");

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
    expect(screen.getByTestId("canvas-message")).toHaveTextContent("目标层不正确");
    expect(screen.getByTestId("canvas-message")).toHaveTextContent("同一层");
  });

  it("updates parameter value from panel for parameterized gate", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "op-rx", gate: "rx", targets: [0], layer: 0, params: [0] }],
    };
    const onCircuitChange = vi.fn();
    render(<CircuitCanvas circuit={model} onCircuitChange={onCircuitChange} minLayers={2} />);

    fireEvent.click(screen.getByTestId("canvas-cell-0-0"));
    fireEvent.change(screen.getByLabelText("param-theta"), {
      target: { value: "1.57" },
    });

    expect(onCircuitChange).toHaveBeenCalledTimes(1);
    const nextModel = onCircuitChange.mock.calls[0][0] as CircuitModel;
    expect(nextModel.operations[0].params?.[0]).toBeCloseTo(1.57, 6);
  });
});
