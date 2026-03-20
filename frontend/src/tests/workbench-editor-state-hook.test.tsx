import { act, renderHook } from "@testing-library/react";

import type { CircuitModel } from "../features/circuit/model/types";
import { useWorkbenchEditorState } from "../features/circuit/ui/use-workbench-editor-state";

const PROJECT_CIRCUIT: CircuitModel = {
  numQubits: 2,
  operations: [{ id: "proj-1", gate: "x", targets: [1], layer: 0 }],
};

describe("useWorkbenchEditorState", () => {
  it("supports undo, redo, reset, and restoring project state", () => {
    const { result } = renderHook(() => useWorkbenchEditorState());
    const initialCircuit = result.current.circuit;
    const projectQasm = "OPENQASM 3;\nqubit[2] q;\nx q[1];";

    act(() => {
      result.current.pushCircuit({
        numQubits: initialCircuit.numQubits,
        operations: [{ id: "op-1", gate: "x", targets: [0], layer: 0 }],
      });
    });

    expect(result.current.historyState.canUndo).toBe(true);
    expect(result.current.circuit.operations).toHaveLength(1);

    act(() => {
      result.current.historyState.onUndo();
    });

    expect(result.current.circuit.operations).toHaveLength(initialCircuit.operations.length);

    act(() => {
      result.current.historyState.onRedo();
    });

    expect(result.current.circuit.operations).toHaveLength(1);

    act(() => {
      result.current.replaceFromProject({
        circuit: PROJECT_CIRCUIT,
        qasm: projectQasm,
        displayMode: "ALL",
      });
    });

    expect(result.current.circuit).toEqual(PROJECT_CIRCUIT);
    expect(result.current.displayMode).toBe("ALL");
    expect(result.current.qasm).toContain("OPENQASM 3;");

    act(() => {
      result.current.actions.onResetWorkbench();
    });

    expect(result.current.displayMode).toBe("FILTERED");
    expect(result.current.qasm).not.toEqual(projectQasm);
  });

  it("blocks qubit decrease when higher qubits are still referenced", () => {
    const { result } = renderHook(() => useWorkbenchEditorState());

    act(() => {
      result.current.replaceFromProject({
        circuit: PROJECT_CIRCUIT,
        qasm: "OPENQASM 3;\nqubit[2] q;\nx q[1];",
        displayMode: "FILTERED",
      });
    });

    act(() => {
      result.current.actions.onDecreaseQubits();
    });

    expect(result.current.canvasControls.qubitMessage).toBeTruthy();
    expect(result.current.circuit.numQubits).toBe(2);
  });
});
