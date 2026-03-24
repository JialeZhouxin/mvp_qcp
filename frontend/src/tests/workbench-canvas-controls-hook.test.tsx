import { act, renderHook } from "@testing-library/react";

import type { CircuitModel } from "../features/circuit/model/types";
import { useWorkbenchCanvasControls } from "../features/circuit/ui/use-workbench-canvas-controls";

describe("useWorkbenchCanvasControls", () => {
  it("clears qubit warnings after loading a template and delegates reset", () => {
    const blockedCircuit: CircuitModel = {
      numQubits: 2,
      operations: [{ id: "op-1", gate: "x", targets: [1], layer: 0 }],
    };
    const onPushCircuit = vi.fn();
    const onResetWorkbench = vi.fn();

    const { result } = renderHook(() =>
      useWorkbenchCanvasControls({
        circuit: blockedCircuit,
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onPushCircuit,
        onResetWorkbench,
      }),
    );

    act(() => {
      result.current.canvasControls.onDecreaseQubits();
    });

    expect(result.current.qubitMessage).toBeTruthy();
    expect(onPushCircuit).not.toHaveBeenCalled();

    act(() => {
      result.current.canvasControls.onLoadTemplate("bell");
    });

    expect(onPushCircuit).toHaveBeenCalledTimes(1);
    expect(onPushCircuit.mock.calls[0][0]).toMatchObject({
      numQubits: 2,
      operations: expect.any(Array),
    });
    expect(result.current.qubitMessage).toBeNull();

    act(() => {
      result.current.canvasControls.onResetWorkbench();
    });

    expect(onResetWorkbench).toHaveBeenCalledTimes(1);
    expect(result.current.qubitMessage).toBeNull();
  });
});
