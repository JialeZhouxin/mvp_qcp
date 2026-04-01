import {
  createHistoryState,
  pushHistoryState,
  type EditorHistoryState,
} from "../model/history";
import { loadCircuitTemplate } from "../model/templates";
import type { CircuitModel, Operation } from "../model/types";
import type { ProbabilityDisplayMode } from "../simulation/probability-filter";
import { toQasm3 } from "../qasm/qasm-bridge";
import type { WorkbenchDraftPayload } from "./draft-storage";

const DEFAULT_TEMPLATE_ID = "bell";

export interface InitialWorkbenchState {
  readonly circuit: CircuitModel;
  readonly qasm: string;
  readonly displayMode: ProbabilityDisplayMode;
  readonly simulationStep: number;
}

export function createDefaultCircuit(): CircuitModel {
  return loadCircuitTemplate(DEFAULT_TEMPLATE_ID);
}

function clampInitialSimulationStep(circuit: CircuitModel, simulationStep: number | undefined): number {
  if (simulationStep === undefined) {
    return circuit.operations.length;
  }
  return Math.max(0, Math.min(simulationStep, circuit.operations.length));
}

export function buildInitialState(
  defaultMode: ProbabilityDisplayMode,
  draft?: WorkbenchDraftPayload | null,
): InitialWorkbenchState {
  if (draft) {
    return {
      circuit: draft.circuit,
      qasm: draft.qasm,
      displayMode: draft.displayMode,
      simulationStep: clampInitialSimulationStep(draft.circuit, draft.simulationStep),
    };
  }
  const defaultCircuit = createDefaultCircuit();
  return {
    circuit: defaultCircuit,
    qasm: toQasm3(defaultCircuit),
    displayMode: defaultMode,
    simulationStep: defaultCircuit.operations.length,
  };
}

function sortOperationsByLayerThenId(operations: readonly Operation[]): readonly Operation[] {
  return [...operations].sort((left, right) => {
    if (left.layer !== right.layer) {
      return left.layer - right.layer;
    }
    return left.id.localeCompare(right.id);
  });
}

function normalizeParams(values: readonly number[] | undefined): readonly number[] {
  if (!values) {
    return [];
  }
  return values.map((value) => Number(value.toFixed(12)));
}

export function areCircuitsSemanticallyEquivalent(left: CircuitModel, right: CircuitModel): boolean {
  return toQasm3(left).trim() === toQasm3(right).trim();
}

export function areCircuitsLayoutEquivalent(left: CircuitModel, right: CircuitModel): boolean {
  if (left.numQubits !== right.numQubits) {
    return false;
  }
  const leftOperations = sortOperationsByLayerThenId(left.operations);
  const rightOperations = sortOperationsByLayerThenId(right.operations);
  if (leftOperations.length !== rightOperations.length) {
    return false;
  }

  for (let index = 0; index < leftOperations.length; index += 1) {
    const leftOperation = leftOperations[index];
    const rightOperation = rightOperations[index];
    const leftControls = leftOperation.controls ?? [];
    const rightControls = rightOperation.controls ?? [];
    const leftParams = normalizeParams(leftOperation.params);
    const rightParams = normalizeParams(rightOperation.params);
    if (
      leftOperation.gate !== rightOperation.gate ||
      leftOperation.layer !== rightOperation.layer ||
      leftOperation.targets.length !== rightOperation.targets.length ||
      leftControls.length !== rightControls.length ||
      leftParams.length !== rightParams.length
    ) {
      return false;
    }
    for (let targetIndex = 0; targetIndex < leftOperation.targets.length; targetIndex += 1) {
      if (leftOperation.targets[targetIndex] !== rightOperation.targets[targetIndex]) {
        return false;
      }
    }
    for (let controlIndex = 0; controlIndex < leftControls.length; controlIndex += 1) {
      if (leftControls[controlIndex] !== rightControls[controlIndex]) {
        return false;
      }
    }
    for (let paramIndex = 0; paramIndex < leftParams.length; paramIndex += 1) {
      if (leftParams[paramIndex] !== rightParams[paramIndex]) {
        return false;
      }
    }
  }

  return true;
}

export const areCircuitsEquivalent = areCircuitsSemanticallyEquivalent;

export function createNextHistoryState(
  previous: EditorHistoryState<CircuitModel>,
  next: CircuitModel,
): EditorHistoryState<CircuitModel> {
  return pushHistoryState(previous, next, { equals: areCircuitsLayoutEquivalent });
}

export function formatComplexityMessage(message: string | undefined): string {
  if (!message) {
    return "线路复杂度超过限制。";
  }
  return `线路复杂度超过限制：${message}`;
}

export function isCircuitModel(value: unknown): value is CircuitModel {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as { numQubits?: unknown; operations?: unknown };
  return typeof candidate.numQubits === "number" && Array.isArray(candidate.operations);
}

export { DEFAULT_TEMPLATE_ID };
