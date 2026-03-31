import { act, renderHook } from "@testing-library/react";

import type { CircuitModel } from "../features/circuit/model/types";
import { clearWorkbenchDraft } from "../features/circuit/ui/draft-storage";
import { useWorkbenchEditorState } from "../features/circuit/ui/use-workbench-editor-state";

const PROJECT_CIRCUIT: CircuitModel = {
  numQubits: 2,
  operations: [{ id: "proj-1", gate: "x", targets: [1], layer: 0 }],
};

describe("useWorkbenchEditorState", () => {
  beforeEach(() => {
    clearWorkbenchDraft();
    window.localStorage.clear();
  });

  it("keeps following the end when circuit growth happens at the current end", () => {
    const { result } = renderHook(() => useWorkbenchEditorState());
    const getEditorState = () =>
      result.current as typeof result.current & {
        simulationStep: number;
      };
    const nextOperations = [
      ...result.current.circuit.operations,
      { id: "op-growth", gate: "x", targets: [0], layer: 4 },
    ] as const;

    expect(getEditorState().simulationStep).toBe(result.current.circuit.operations.length);

    act(() => {
      result.current.pushCircuit({
        numQubits: result.current.circuit.numQubits,
        operations: [...nextOperations],
      });
    });

    expect(getEditorState().simulationStep).toBe(nextOperations.length);
  });

  it("does not jump to the end when circuit growth happens away from the current step", () => {
    const { result } = renderHook(() => useWorkbenchEditorState());
    const getEditorState = () =>
      result.current as typeof result.current & {
        simulationStep: number;
        setSimulationStep: (step: number) => void;
      };
    const nextOperations = [
      ...result.current.circuit.operations,
      { id: "op-growth", gate: "x", targets: [0], layer: 4 },
    ] as const;

    act(() => {
      getEditorState().setSimulationStep(2);
    });

    act(() => {
      result.current.pushCircuit({
        numQubits: result.current.circuit.numQubits,
        operations: [...nextOperations],
      });
    });

    expect(getEditorState().simulationStep).toBe(2);
  });

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

  it("keeps simulation step in sync with undo/redo when currently following the end", () => {
    const { result } = renderHook(() => useWorkbenchEditorState());
    const getEditorState = () =>
      result.current as typeof result.current & {
        simulationStep: number;
      };
    const initialLength = result.current.circuit.operations.length;

    act(() => {
      result.current.pushCircuit({
        numQubits: result.current.circuit.numQubits,
        operations: [
          ...result.current.circuit.operations,
          { id: "op-undo-redo-follow", gate: "x", targets: [0], layer: initialLength },
        ],
      });
    });

    expect(getEditorState().circuit.operations).toHaveLength(initialLength + 1);
    expect(getEditorState().simulationStep).toBe(initialLength + 1);

    act(() => {
      result.current.historyState.onUndo();
    });

    expect(getEditorState().circuit.operations).toHaveLength(initialLength);
    expect(getEditorState().simulationStep).toBe(initialLength);

    act(() => {
      result.current.historyState.onRedo();
    });

    expect(getEditorState().circuit.operations).toHaveLength(initialLength + 1);
    expect(getEditorState().simulationStep).toBe(initialLength + 1);
  });

  it("does not jump simulation step on undo/redo when not at the end", () => {
    const { result } = renderHook(() => useWorkbenchEditorState());
    const getEditorState = () =>
      result.current as typeof result.current & {
        simulationStep: number;
        setSimulationStep: (step: number) => void;
      };
    const initialLength = result.current.circuit.operations.length;

    act(() => {
      getEditorState().setSimulationStep(2);
    });

    act(() => {
      result.current.pushCircuit({
        numQubits: result.current.circuit.numQubits,
        operations: [
          ...result.current.circuit.operations,
          { id: "op-undo-redo-not-follow", gate: "x", targets: [0], layer: initialLength },
        ],
      });
    });

    expect(getEditorState().circuit.operations).toHaveLength(initialLength + 1);
    expect(getEditorState().simulationStep).toBe(2);

    act(() => {
      result.current.historyState.onUndo();
    });

    expect(getEditorState().circuit.operations).toHaveLength(initialLength);
    expect(getEditorState().simulationStep).toBe(2);

    act(() => {
      result.current.historyState.onRedo();
    });

    expect(getEditorState().circuit.operations).toHaveLength(initialLength + 1);
    expect(getEditorState().simulationStep).toBe(2);
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

  it("hydrates the initial editor state from the saved draft", () => {
    window.localStorage.setItem(
      "qcp.workbench.draft.v1",
      JSON.stringify({
        version: 1,
        circuit: PROJECT_CIRCUIT,
        qasm: "OPENQASM 3;\nqubit[2] q;\nx q[1];",
        displayMode: "ALL",
        simulationStep: 0,
        updatedAt: Date.now(),
      }),
    );

    const { result } = renderHook(() => useWorkbenchEditorState());

    expect(result.current.circuit).toEqual(PROJECT_CIRCUIT);
    expect(result.current.displayMode).toBe("ALL");
    expect(result.current.qasm).toContain("qubit[2] q;");
    expect(result.current.qasm).toContain("x q[1];");
    expect(result.current.simulationStep).toBe(0);
  });
});
