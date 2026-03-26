import type { CircuitModel, GateName, Operation } from "../model/types";

const KEY_PREFIX = "workbench-v1";

export interface CircuitTaskOperationPayload {
  readonly gate: GateName;
  readonly targets: readonly number[];
  readonly controls?: readonly number[];
  readonly params?: readonly number[];
}

export interface CircuitTaskPayload {
  readonly num_qubits: number;
  readonly operations: readonly CircuitTaskOperationPayload[];
}

function sortOperations(operations: readonly Operation[]): Operation[] {
  return [...operations].sort((left, right) => {
    if (left.layer !== right.layer) {
      return left.layer - right.layer;
    }
    return left.id.localeCompare(right.id);
  });
}

function requireTargets(operation: Operation, expectedCount: number): number[] {
  if (operation.targets.length !== expectedCount) {
    throw new Error(`gate ${operation.gate} expects ${expectedCount} target${expectedCount > 1 ? "s" : ""}`);
  }
  return [...operation.targets];
}

function requireParams(operation: Operation, expectedCount: number): number[] {
  if (!operation.params || operation.params.length !== expectedCount) {
    throw new Error(`gate ${operation.gate} expects ${expectedCount} parameters`);
  }
  return [...operation.params];
}

function requireControls(operation: Operation, expectedCount: number): number[] {
  if (!operation.controls || operation.controls.length !== expectedCount) {
    throw new Error(`gate ${operation.gate} expects ${expectedCount} control${expectedCount > 1 ? "s" : ""}`);
  }
  return [...operation.controls];
}

function normalizeOperation(operation: Operation): CircuitTaskOperationPayload {
  switch (operation.gate) {
    case "swap":
      return { gate: operation.gate, targets: requireTargets(operation, 2) };
    case "cx":
    case "cp":
    case "cz":
      return {
        gate: operation.gate,
        targets: requireTargets(operation, 1),
        controls: requireControls(operation, 1),
        ...(operation.gate === "cp" ? { params: requireParams(operation, 1) } : {}),
      };
    case "ccx":
      return {
        gate: operation.gate,
        targets: requireTargets(operation, 1),
        controls: requireControls(operation, 2),
      };
    case "rx":
    case "ry":
    case "rz":
    case "p":
      return {
        gate: operation.gate,
        targets: requireTargets(operation, 1),
        params: requireParams(operation, 1),
      };
    case "u":
      return {
        gate: operation.gate,
        targets: requireTargets(operation, 1),
        params: requireParams(operation, 3),
      };
    case "i":
    case "x":
    case "y":
    case "z":
    case "h":
    case "s":
    case "sdg":
    case "t":
    case "tdg":
    case "m":
      return {
        gate: operation.gate,
        targets: requireTargets(operation, 1),
      };
    default:
      throw new Error(`unsupported gate: ${String(operation.gate)}`);
  }
}

export function buildCircuitTaskPayload(model: CircuitModel): CircuitTaskPayload {
  return {
    num_qubits: model.numQubits,
    operations: sortOperations(model.operations).map(normalizeOperation),
  };
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  const normalized = hash >>> 0;
  return normalized.toString(16).padStart(8, "0");
}

export function buildSubmitFingerprint(model: CircuitModel): string {
  return JSON.stringify(buildCircuitTaskPayload(model));
}

export function buildIdempotencyKey(fingerprint: string): string {
  return `${KEY_PREFIX}-${fnv1a32(fingerprint)}`;
}
