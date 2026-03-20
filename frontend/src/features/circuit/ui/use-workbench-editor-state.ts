import { useEffect, useMemo, useState } from "react";

import { EDITOR_MAX_QUBITS, EDITOR_MIN_QUBITS } from "../model/constants";
import { decreaseQubits, increaseQubits } from "../model/circuit-model";
import {
  canRedoHistory,
  canUndoHistory,
  createHistoryState,
  redoHistoryState,
  undoHistoryState,
  type EditorHistoryState,
} from "../model/history";
import { loadCircuitTemplate } from "../model/templates";
import type { CircuitModel } from "../model/types";
import { toQasm3 } from "../qasm/qasm-bridge";
import type { QasmParseError } from "../qasm/qasm-errors";
import type { ProbabilityDisplayMode } from "../simulation/probability-filter";
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
  const [qubitMessage, setQubitMessage] = useState<string | null>(null);
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

  const replaceFromProject = (payload: WorkbenchProjectPayload) => {
    setHistory(createHistoryState(payload.circuit));
    setQasm(payload.qasm);
    setDisplayMode(payload.displayMode);
    setParseError(null);
    setQubitMessage(null);
  };

  const onValidQasmChange = (nextModel: CircuitModel) => {
    if (!areCircuitsEquivalent(nextModel, circuit)) {
      pushCircuit(nextModel);
    }
  };

  const onClearCircuit = () => {
    setQubitMessage(null);
    pushCircuit({ numQubits: circuit.numQubits, operations: [] });
  };

  const onResetWorkbench = () => {
    const fallback = createDefaultCircuit();
    setHistory(createHistoryState(fallback));
    setQasm(toQasm3(fallback));
    setDisplayMode(DEFAULT_DISPLAY_MODE);
    setParseError(null);
    setQubitMessage(null);
    setResetVersion((previous) => previous + 1);
  };

  const onIncreaseQubits = () => {
    const result = increaseQubits(circuit, {
      minQubits: EDITOR_MIN_QUBITS,
      maxQubits: EDITOR_MAX_QUBITS,
    });
    if (!result.ok) {
      setQubitMessage("å·²è¾¾åˆ°æœ€å¤§é‡å­æ¯”ç‰¹é™åˆ¶ï¼Œæ— æ³•ç»§ç»­å¢žåŠ ã€‚");
      return;
    }
    setQubitMessage(null);
    pushCircuit(result.model);
  };

  const onDecreaseQubits = () => {
    const result = decreaseQubits(circuit, {
      minQubits: EDITOR_MIN_QUBITS,
      maxQubits: EDITOR_MAX_QUBITS,
    });
    if (!result.ok) {
      if (result.code === "QUBIT_SHRINK_BLOCKED_BY_OPERATION") {
        setQubitMessage("å½“å‰ç”µè·¯ä¸­å­˜åœ¨ä½¿ç”¨é«˜ä½é‡å­æ¯”ç‰¹çš„æ“ä½œï¼Œè¯·å…ˆåˆ é™¤ç›¸å…³é—¨å†å‡å°‘ qubitã€‚");
      } else {
        setQubitMessage("å·²è¾¾åˆ°æœ€å°é‡å­æ¯”ç‰¹é™åˆ¶ï¼Œæ— æ³•ç»§ç»­å‡å°‘ã€‚");
      }
      return;
    }
    setQubitMessage(null);
    pushCircuit(result.model);
  };

  const historyState = {
    canUndo: canUndoHistory(history),
    canRedo: canRedoHistory(history),
    onUndo: () => setHistory((previous) => undoHistoryState(previous)),
    onRedo: () => setHistory((previous) => redoHistoryState(previous)),
  };

  const canvasControls = {
    canUndo: historyState.canUndo,
    canRedo: historyState.canRedo,
    currentQubits: circuit.numQubits,
    canIncreaseQubits: circuit.numQubits < EDITOR_MAX_QUBITS,
    canDecreaseQubits:
      decreaseQubits(circuit, {
        minQubits: EDITOR_MIN_QUBITS,
        maxQubits: EDITOR_MAX_QUBITS,
      }).ok,
    qubitMessage,
    onIncreaseQubits,
    onDecreaseQubits,
    onClearCircuit,
    onResetWorkbench,
    onLoadTemplate: (templateId: string) => pushCircuit(loadCircuitTemplate(templateId)),
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
    canvasControls,
    actions: {
      onClearCircuit,
      onResetWorkbench,
      onIncreaseQubits,
      onDecreaseQubits,
    },
    resetVersion,
  };
}
