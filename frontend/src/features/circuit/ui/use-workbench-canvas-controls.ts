import { useState } from "react";

import { EDITOR_MAX_QUBITS, EDITOR_MIN_QUBITS } from "../model/constants";
import { decreaseQubits, increaseQubits } from "../model/circuit-model";
import { loadCircuitTemplate, type LoadCircuitTemplateOptions } from "../model/templates";
import type { CircuitModel } from "../model/types";
import { WORKBENCH_COPY } from "./copy-catalog";

export interface UseWorkbenchCanvasControlsOptions {
  readonly circuit: CircuitModel;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onPushCircuit: (next: CircuitModel) => void;
  readonly onResetWorkbench: () => void;
}

export function useWorkbenchCanvasControls({
  circuit,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPushCircuit,
  onResetWorkbench,
}: UseWorkbenchCanvasControlsOptions) {
  const [qubitMessage, setQubitMessage] = useState<string | null>(null);

  const onClearCircuit = () => {
    setQubitMessage(null);
    onPushCircuit({ numQubits: circuit.numQubits, operations: [] });
  };

  const onIncreaseQubits = () => {
    const result = increaseQubits(circuit, {
      minQubits: EDITOR_MIN_QUBITS,
      maxQubits: EDITOR_MAX_QUBITS,
    });
    if (!result.ok) {
      setQubitMessage(WORKBENCH_COPY.editor.maxQubitReached);
      return;
    }
    setQubitMessage(null);
    onPushCircuit(result.model);
  };

  const onDecreaseQubits = () => {
    const result = decreaseQubits(circuit, {
      minQubits: EDITOR_MIN_QUBITS,
      maxQubits: EDITOR_MAX_QUBITS,
    });
    if (!result.ok) {
      if (result.code === "QUBIT_SHRINK_BLOCKED_BY_OPERATION") {
        setQubitMessage(WORKBENCH_COPY.editor.shrinkBlockedByOperation);
      } else {
        setQubitMessage(WORKBENCH_COPY.editor.minQubitReached);
      }
      return;
    }
    setQubitMessage(null);
    onPushCircuit(result.model);
  };

  const handleResetWorkbench = () => {
    setQubitMessage(null);
    onResetWorkbench();
  };

  const onLoadTemplate = (
    templateId: string,
    options?: LoadCircuitTemplateOptions,
  ) => {
    try {
      setQubitMessage(null);
      onPushCircuit(loadCircuitTemplate(templateId, options));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : WORKBENCH_COPY.editor.maxQubitReached;
      setQubitMessage(errorMessage);
    }
  };

  return {
    qubitMessage,
    clearQubitMessage: () => setQubitMessage(null),
    canvasControls: {
      canUndo,
      canRedo,
      currentQubits: circuit.numQubits,
      canIncreaseQubits: circuit.numQubits < EDITOR_MAX_QUBITS,
      canDecreaseQubits:
        decreaseQubits(circuit, {
          minQubits: EDITOR_MIN_QUBITS,
          maxQubits: EDITOR_MAX_QUBITS,
        }).ok,
      qubitMessage,
      onUndo,
      onRedo,
      onIncreaseQubits,
      onDecreaseQubits,
      onClearCircuit,
      onResetWorkbench: handleResetWorkbench,
      onLoadTemplate,
    },
    actions: {
      onClearCircuit,
      onResetWorkbench: handleResetWorkbench,
      onIncreaseQubits,
      onDecreaseQubits,
    },
  };
}
