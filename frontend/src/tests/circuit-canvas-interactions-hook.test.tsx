import { act, renderHook } from "@testing-library/react";

import type { CircuitModel } from "../features/circuit/model/types";
import { useCircuitCanvasInteractions } from "../features/circuit/components/use-circuit-canvas-interactions";

describe("useCircuitCanvasInteractions", () => {
  it("tracks pending multi-qubit placement and commits the completed operation", () => {
    const circuit: CircuitModel = { numQubits: 2, operations: [] };
    const onCircuitChange = vi.fn();

    const { result } = renderHook(() =>
      useCircuitCanvasInteractions({
        circuit,
        onCircuitChange,
      }),
    );

    act(() => {
      result.current.onDropGate("cx", 0, 0);
    });

    expect(result.current.pendingPlacement).toMatchObject({
      gate: "cx",
      layer: 0,
      selectedQubits: [0],
      requiredQubits: 2,
    });
    expect(result.current.interactionMessage).toBeTruthy();
    expect(onCircuitChange).not.toHaveBeenCalled();

    act(() => {
      result.current.onCellClick(1, 0);
    });

    expect(onCircuitChange).toHaveBeenCalledTimes(1);
    expect(onCircuitChange.mock.calls[0][0]).toMatchObject({
      operations: [
        {
          gate: "cx",
          controls: [0],
          targets: [1],
          layer: 0,
        },
      ],
    });
  });

  it("cancels pending placement and shifts operations when inserting columns", () => {
    const circuit: CircuitModel = {
      numQubits: 3,
      operations: [{ id: "op-1", gate: "x", targets: [0], layer: 0 }],
    };
    const onCircuitChange = vi.fn();

    const { result } = renderHook(() =>
      useCircuitCanvasInteractions({
        circuit,
        onCircuitChange,
      }),
    );

    act(() => {
      result.current.onDropGate("cx", 1, 2);
    });
    expect(result.current.pendingPlacement).not.toBeNull();

    act(() => {
      result.current.onInsertColumns(1, 1);
    });

    expect(result.current.pendingPlacement).toBeNull();
    expect(onCircuitChange).toHaveBeenCalledTimes(1);
    expect(onCircuitChange.mock.calls[0][0]).toMatchObject({
      operations: [
        {
          id: "op-1",
          gate: "x",
          targets: [0],
          layer: 1,
        },
      ],
    });
  });

  it("blocks deleting columns when target range contains gates", () => {
    const circuit: CircuitModel = {
      numQubits: 2,
      operations: [{ id: "op-1", gate: "x", targets: [0], layer: 1 }],
    };
    const onCircuitChange = vi.fn();
    const { result } = renderHook(() =>
      useCircuitCanvasInteractions({
        circuit,
        onCircuitChange,
      }),
    );

    act(() => {
      result.current.onDeleteEmptyColumns(3, 2);
    });

    expect(onCircuitChange).not.toHaveBeenCalled();
    expect(result.current.interactionMessage).toBeTruthy();
  });
});
