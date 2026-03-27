import type { CircuitModel, GateName, Operation } from "../model/types";
import type { ProbabilityDisplayMode } from "../simulation/probability-filter";

const DRAFT_STORAGE_KEY = "qcp.workbench.draft.v1";
const DRAFT_VERSION = 1;

export interface WorkbenchDraftPayload {
  readonly version: 1;
  readonly circuit: CircuitModel;
  readonly qasm: string;
  readonly displayMode: ProbabilityDisplayMode;
  readonly simulationStep?: number;
  readonly updatedAt: number;
}

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isGateName(value: unknown): value is GateName {
  return (
    value === "i" ||
    value === "x" ||
    value === "y" ||
    value === "z" ||
    value === "h" ||
    value === "s" ||
    value === "sdg" ||
    value === "t" ||
    value === "tdg" ||
    value === "rx" ||
    value === "ry" ||
    value === "rz" ||
    value === "u" ||
    value === "cx" ||
    value === "cz" ||
    value === "swap" ||
    value === "m"
  );
}

function isNumberArray(value: unknown): value is readonly number[] {
  return Array.isArray(value) && value.every((item) => Number.isFinite(item));
}

function parseOperation(value: unknown): Operation | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    !isGateName(raw.gate) ||
    typeof raw.layer !== "number" ||
    !isNumberArray(raw.targets)
  ) {
    return null;
  }
  if (raw.controls !== undefined && !isNumberArray(raw.controls)) {
    return null;
  }
  if (raw.params !== undefined && !isNumberArray(raw.params)) {
    return null;
  }
  return {
    id: raw.id,
    gate: raw.gate,
    layer: raw.layer,
    targets: [...raw.targets],
    controls: raw.controls ? [...raw.controls] : undefined,
    params: raw.params ? [...raw.params] : undefined,
  };
}

function parseCircuit(value: unknown): CircuitModel | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.numQubits !== "number" || !Array.isArray(raw.operations)) {
    return null;
  }
  const operations = raw.operations
    .map((operation) => parseOperation(operation))
    .filter((operation): operation is Operation => operation !== null);
  if (operations.length !== raw.operations.length) {
    return null;
  }
  return {
    numQubits: raw.numQubits,
    operations,
  };
}

function parseDisplayMode(value: unknown): ProbabilityDisplayMode | null {
  if (value === "FILTERED" || value === "ALL") {
    return value;
  }
  return null;
}

function parseSimulationStep(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return undefined;
  }
  return value;
}

export function saveWorkbenchDraft(payload: WorkbenchDraftPayload): void {
  if (!hasWindow()) {
    return;
  }
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("failed to save workbench draft", error);
  }
}

export function loadWorkbenchDraft(): WorkbenchDraftPayload | null {
  if (!hasWindow()) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.version !== DRAFT_VERSION) {
      return null;
    }
    const circuit = parseCircuit(parsed.circuit);
    const displayMode = parseDisplayMode(parsed.displayMode);
    if (
      !circuit ||
      !displayMode ||
      typeof parsed.qasm !== "string" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }
    return {
      version: DRAFT_VERSION,
      circuit,
      qasm: parsed.qasm,
      displayMode,
      simulationStep: parseSimulationStep(parsed.simulationStep),
      updatedAt: parsed.updatedAt,
    };
  } catch (error) {
    console.error("failed to load workbench draft", error);
    return null;
  }
}

export function clearWorkbenchDraft(): void {
  if (!hasWindow()) {
    return;
  }
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    console.error("failed to clear workbench draft", error);
  }
}
