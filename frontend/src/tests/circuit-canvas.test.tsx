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
});

