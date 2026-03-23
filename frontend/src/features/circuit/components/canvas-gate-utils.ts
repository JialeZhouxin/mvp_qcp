import { getGateCatalog, getGateCatalogItem } from "../gates/gate-catalog";
import type { GateName, Operation } from "../model/types";

export type ParameterizedGate = "rx" | "ry" | "rz" | "u" | "p" | "cp";

export interface PendingPlacement {
  readonly gate: GateName;
  readonly layer: number;
  readonly selectedQubits: readonly number[];
  readonly requiredQubits: number;
  readonly controlCount: number;
  readonly targetCount: number;
}

export interface PlacementOperation {
  readonly gate: GateName;
  readonly layer: number;
  readonly targets: readonly number[];
  readonly controls?: readonly number[];
  readonly params?: readonly number[];
}

export type AdvancePendingPlacementResult =
  | { readonly kind: "error"; readonly code: "SAME_QUBIT" }
  | { readonly kind: "continue"; readonly pending: PendingPlacement }
  | { readonly kind: "done"; readonly operation: PlacementOperation };

const SUPPORTED_GATES = new Set<GateName>(
  getGateCatalog().map((item) => item.name),
);

export const PARAMETER_LABELS: Readonly<Record<ParameterizedGate, readonly string[]>> = {
  rx: ["theta"],
  ry: ["theta"],
  rz: ["theta"],
  u: ["theta", "phi", "lambda"],
  p: ["lambda"],
  cp: ["lambda"],
};

export function isSupportedGate(value: string): value is GateName {
  return SUPPORTED_GATES.has(value as GateName);
}

export function isParameterizedGate(gate: GateName): gate is ParameterizedGate {
  return gate === "rx" || gate === "ry" || gate === "rz" || gate === "u" || gate === "p" || gate === "cp";
}

export function getDefaultParams(gate: GateName): readonly number[] | undefined {
  if (gate === "rx" || gate === "ry" || gate === "rz") {
    return [0];
  }
  if (gate === "u") {
    return [0, 0, 0];
  }
  if (gate === "p" || gate === "cp") {
    return [0];
  }
  return undefined;
}

export function buildSingleQubitOperation(gate: GateName, qubit: number, layer: number) {
  return {
    gate,
    layer,
    targets: [qubit],
    params: getDefaultParams(gate),
  };
}

export function createPendingPlacement(
  gate: GateName,
  sourceQubit: number,
  layer: number,
): PendingPlacement | null {
  const catalog = getGateCatalogItem(gate);
  const requiredQubits = catalog.controlCount + catalog.targetCount;
  if (requiredQubits <= 1) {
    return null;
  }
  return {
    gate,
    layer,
    selectedQubits: [sourceQubit],
    requiredQubits,
    controlCount: catalog.controlCount,
    targetCount: catalog.targetCount,
  };
}

function buildOperationFromPending(pending: PendingPlacement): PlacementOperation {
  const controls = pending.selectedQubits.slice(0, pending.controlCount);
  const targets = pending.selectedQubits.slice(
    pending.controlCount,
    pending.controlCount + pending.targetCount,
  );
  return {
    gate: pending.gate,
    layer: pending.layer,
    targets,
    controls: controls.length > 0 ? controls : undefined,
    params: getDefaultParams(pending.gate),
  };
}

export function advancePendingPlacement(
  pending: PendingPlacement,
  qubit: number,
): AdvancePendingPlacementResult {
  if (pending.selectedQubits.includes(qubit)) {
    return { kind: "error", code: "SAME_QUBIT" };
  }
  const selectedQubits = [...pending.selectedQubits, qubit];
  const nextPending = {
    ...pending,
    selectedQubits,
  };
  if (selectedQubits.length < pending.requiredQubits) {
    return { kind: "continue", pending: nextPending };
  }
  return {
    kind: "done",
    operation: buildOperationFromPending(nextPending),
  };
}

export function getParameterValues(operation: Operation): readonly number[] {
  if (!isParameterizedGate(operation.gate)) {
    return [];
  }
  if (operation.params && operation.params.length > 0) {
    return operation.params;
  }
  return getDefaultParams(operation.gate) ?? [];
}


