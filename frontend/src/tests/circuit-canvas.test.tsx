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
    expect(screen.getByText(/already has an operation/)).toBeInTheDocument();
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

    fireEvent.click(screen.getByTestId("canvas-cell-1-0"));
    expect(onCircuitChange).toHaveBeenCalledTimes(1);
    const nextModel = onCircuitChange.mock.calls[0][0] as CircuitModel;
    expect(nextModel.operations[0].gate).toBe("cx");
    expect(nextModel.operations[0].controls).toEqual([0]);
    expect(nextModel.operations[0].targets).toEqual([1]);
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
