import { useEffect, useState } from "react";

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
import { loadWorkbenchDraft } from "./draft-storage";
import {
  areCircuitsSemanticallyEquivalent,
  buildInitialState,
  createDefaultCircuit,
  createNextHistoryState,
} from "./workbench-model-utils";
import { clampSimulationStepOnCircuitChange } from "./workbench-time-step";

const DEFAULT_DISPLAY_MODE: ProbabilityDisplayMode = "FILTERED";

export interface WorkbenchProjectPayload {
  readonly circuit: CircuitModel;
  readonly qasm: string;
  readonly displayMode: ProbabilityDisplayMode;
}

export function useWorkbenchEditorState() {
  const [initialState] = useState(() => buildInitialState(DEFAULT_DISPLAY_MODE, loadWorkbenchDraft()));
  const [history, setHistory] = useState<EditorHistoryState<CircuitModel>>(() =>
    createHistoryState(initialState.circuit),
  );
  const [qasm, setQasm] = useState(initialState.qasm);
  const [displayMode, setDisplayMode] = useState<ProbabilityDisplayMode>(initialState.displayMode);
  const [parseError, setParseError] = useState<QasmParseError | null>(null);
  const [resetVersion, setResetVersion] = useState(0);
  const [simulationStep, setSimulationStep] = useState(initialState.simulationStep);

  const circuit = history.present;

  useEffect(() => {
    const normalized = toQasm3(circuit);
    setQasm((previous) => (previous === normalized ? previous : normalized));
    setParseError(null);
  }, [circuit]);

  const pushCircuit = (next: CircuitModel) => {
    setSimulationStep((currentStep) =>
      clampSimulationStepOnCircuitChange(
        currentStep,
        circuit.operations.length,
        next.operations.length,
      ),
    );
    setHistory((previous) => createNextHistoryState(previous, next));
  };

  const applyHistoryTransition = (
    transition: (state: EditorHistoryState<CircuitModel>) => EditorHistoryState<CircuitModel>,
  ) => {
    setHistory((previous) => {
      const next = transition(previous);
      setSimulationStep((currentStep) =>
        clampSimulationStepOnCircuitChange(
          currentStep,
          previous.present.operations.length,
          next.present.operations.length,
        ),
      );
      return next;
    });
  };

  const historyState = {
    canUndo: canUndoHistory(history),
    canRedo: canRedoHistory(history),
    onUndo: () => applyHistoryTransition(undoHistoryState),
    onRedo: () => applyHistoryTransition(redoHistoryState),
  };

  const resetWorkbenchState = () => {
    const fallback = createDefaultCircuit();
    setHistory(createHistoryState(fallback));
    setQasm(toQasm3(fallback));
    setDisplayMode(DEFAULT_DISPLAY_MODE);
    setParseError(null);
    setSimulationStep(fallback.operations.length);
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
    setSimulationStep((currentStep) =>
      clampSimulationStepOnCircuitChange(
        currentStep,
        circuit.operations.length,
        payload.circuit.operations.length,
      ),
    );
    setHistory(createHistoryState(payload.circuit));
    setQasm(payload.qasm);
    setDisplayMode(payload.displayMode);
    setParseError(null);
  };

  const onValidQasmChange = (nextModel: CircuitModel) => {
    if (!areCircuitsSemanticallyEquivalent(nextModel, circuit)) {
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
    simulationStep,
    setSimulationStep,
  };
}
