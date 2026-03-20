import {
  createHistoryState,
  pushHistoryState,
  type EditorHistoryState,
} from "../model/history";
import { loadCircuitTemplate } from "../model/templates";
import type { CircuitModel } from "../model/types";
import type { ProbabilityDisplayMode } from "../simulation/probability-filter";
import { toQasm3 } from "../qasm/qasm-bridge";

const DEFAULT_TEMPLATE_ID = "bell";

export interface InitialWorkbenchState {
  readonly circuit: CircuitModel;
  readonly qasm: string;
  readonly displayMode: ProbabilityDisplayMode;
}

export function createDefaultCircuit(): CircuitModel {
  return loadCircuitTemplate(DEFAULT_TEMPLATE_ID);
}

export function buildInitialState(defaultMode: ProbabilityDisplayMode): InitialWorkbenchState {
  const defaultCircuit = createDefaultCircuit();
  return { circuit: defaultCircuit, qasm: toQasm3(defaultCircuit), displayMode: defaultMode };
}

export function areCircuitsEquivalent(left: CircuitModel, right: CircuitModel): boolean {
  return toQasm3(left).trim() === toQasm3(right).trim();
}

export function createNextHistoryState(
  previous: EditorHistoryState<CircuitModel>,
  next: CircuitModel,
): EditorHistoryState<CircuitModel> {
  return pushHistoryState(previous, next, { equals: areCircuitsEquivalent });
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
