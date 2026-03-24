import { useEffect, useMemo, useState } from "react";

import { EDITOR_MAX_QUBITS } from "../model/constants";
import {
  canRedoHistory,
  canUndoHistory,
  createHistoryState,
  redoHistoryState,
  undoHistoryState,
  type EditorHistoryState,
} from "../model/history";
import type { CircuitModel } from "../model/types";
import { toQasm3 } from "../qasm/qasm-bridge";
import type { QasmParseError } from "../qasm/qasm-errors";
import type { ProbabilityDisplayMode } from "../simulation/probability-filter";
import { useWorkbenchCanvasControls } from "./use-workbench-canvas-controls";
import {
  areCircuitsEquivalent,
  buildInitialState,
  createDefaultCircuit,
  createNextHistoryState,
} from "./workbench-model-utils";

const DEFAULT_DISPLAY_MODE: ProbabilityDisplayMode = "FILTERED";

export interface WorkbenchProjectPayload {
  readonly circuit: CircuitModel;
  readonly qasm: string;
  readonly displayMode: ProbabilityDisplayMode;
}

export function useWorkbenchEditorState() {
  const initialState = useMemo(() => buildInitialState(DEFAULT_DISPLAY_MODE), []);
  const [history, setHistory] = useState<EditorHistoryState<CircuitModel>>(() =>
    createHistoryState(initialState.circuit),
  );
  const [qasm, setQasm] = useState(initialState.qasm);
  const [displayMode, setDisplayMode] = useState<ProbabilityDisplayMode>(initialState.displayMode);
  const [parseError, setParseError] = useState<QasmParseError | null>(null);
  const [resetVersion, setResetVersion] = useState(0);

  const circuit = history.present;

  useEffect(() => {
    const normalized = toQasm3(circuit);
    setQasm((previous) => (previous === normalized ? previous : normalized));
    setParseError(null);
  }, [circuit]);

  const pushCircuit = (next: CircuitModel) => {
    setHistory((previous) => createNextHistoryState(previous, next));
  };

  const historyState = {
    canUndo: canUndoHistory(history),
    canRedo: canRedoHistory(history),
    onUndo: () => setHistory((previous) => undoHistoryState(previous)),
    onRedo: () => setHistory((previous) => redoHistoryState(previous)),
  };

  const resetWorkbenchState = () => {
    const fallback = createDefaultCircuit();
    setHistory(createHistoryState(fallback));
    setQasm(toQasm3(fallback));
    setDisplayMode(DEFAULT_DISPLAY_MODE);
    setParseError(null);
    setResetVersion((previous) => previous + 1);
  };

  const { clearQubitMessage, canvasControls, actions } = useWorkbenchCanvasControls({
    circuit,
    canUndo: historyState.canUndo,
    canRedo: historyState.canRedo,
    onUndo: historyState.onUndo,
    onRedo: historyState.onRedo,
    onPushCircuit: pushCircuit,
    onResetWorkbench: resetWorkbenchState,
  });

  const replaceFromProject = (payload: WorkbenchProjectPayload) => {
    clearQubitMessage();
    setHistory(createHistoryState(payload.circuit));
    setQasm(payload.qasm);
    setDisplayMode(payload.displayMode);
    setParseError(null);
  };

  const onValidQasmChange = (nextModel: CircuitModel) => {
    if (!areCircuitsEquivalent(nextModel, circuit)) {
      pushCircuit(nextModel);
    }
  };

  return {
    circuit,
    qasm,
    setQasm,
    displayMode,
    setDisplayMode,
    parseError,
    setParseError,
    pushCircuit,
    onValidQasmChange,
    replaceFromProject,
    historyState,
    canvasControls: {
      ...canvasControls,
      canIncreaseQubits: circuit.numQubits < EDITOR_MAX_QUBITS,
    },
    actions,
    resetVersion,
  };
}
