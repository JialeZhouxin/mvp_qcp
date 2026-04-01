import type { CircuitModel, Operation } from "./types";

export type CircuitValidationErrorCode =
  | "CELL_CONFLICT"
  | "INVALID_MULTI_QUBIT_OPERATION"
  | "NON_TERMINAL_MEASUREMENT";

export interface CircuitValidationError {
  readonly code: CircuitValidationErrorCode;
  readonly message: string;
  readonly operationId?: string;
}

export type CircuitValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: CircuitValidationError };

function sortOperations(operations: readonly Operation[]): readonly Operation[] {
  return [...operations].sort((left, right) => {
    if (left.layer !== right.layer) {
      return left.layer - right.layer;
    }
    return left.id.localeCompare(right.id);
  });
}

function toTouchedQubits(operation: Operation): number[] {
  const touched = [...operation.targets, ...(operation.controls ?? [])];
  return [...new Set(touched)];
}

function toOccupiedQubits(operation: Operation): number[] {
  const touched = toTouchedQubits(operation);
  if (touched.length < 2) {
    return touched;
  }
  const minQubit = Math.min(...touched);
  const maxQubit = Math.max(...touched);
  return Array.from(
    { length: maxQubit - minQubit + 1 },
    (_, offset) => minQubit + offset,
  );
}

function findInvalidMultiQubitOperation(
  operations: readonly Operation[],
): Operation | null {
  for (const operation of operations) {
    const touched = [...operation.targets, ...(operation.controls ?? [])];
    const uniqueTouched = new Set(touched);
    if (uniqueTouched.size !== touched.length) {
      return operation;
    }
  }
  return null;
}

function findCellConflict(
  operations: readonly Operation[],
): { current: Operation; layer: number; qubit: number } | null {
  const occupied = new Map<string, string>();
  for (const operation of operations) {
    for (const qubit of toOccupiedQubits(operation)) {
      const key = `${operation.layer}:${qubit}`;
      const existing = occupied.get(key);
      if (existing && existing !== operation.id) {
        return { current: operation, layer: operation.layer, qubit };
      }
      occupied.set(key, operation.id);
    }
  }
  return null;
}

function findNonTerminalMeasurement(
  operations: readonly Operation[],
): Operation | null {
  const firstMeasurementLayer = operations
    .filter((operation) => operation.gate === "m")
    .reduce<number | null>(
      (minLayer, operation) =>
        minLayer === null ? operation.layer : Math.min(minLayer, operation.layer),
      null,
    );
  if (firstMeasurementLayer === null) {
    return null;
  }
  return (
    operations.find(
      (operation) => operation.gate !== "m" && operation.layer >= firstMeasurementLayer,
    ) ?? null
  );
}

export function validateCircuitModel(model: CircuitModel): CircuitValidationResult {
  const operations = sortOperations(model.operations);

  const invalidOperation = findInvalidMultiQubitOperation(operations);
  if (invalidOperation) {
    return {
      ok: false,
      error: {
        code: "INVALID_MULTI_QUBIT_OPERATION",
        message: "multi-qubit operation cannot reference the same qubit twice",
        operationId: invalidOperation.id,
      },
    };
  }

  const conflict = findCellConflict(operations);
  if (conflict) {
    return {
      ok: false,
      error: {
        code: "CELL_CONFLICT",
        message: `layer ${conflict.layer} qubit ${conflict.qubit} has conflicting operations`,
        operationId: conflict.current.id,
      },
    };
  }

  const nonTerminal = findNonTerminalMeasurement(operations);
  if (nonTerminal) {
    return {
      ok: false,
      error: {
        code: "NON_TERMINAL_MEASUREMENT",
        message: "measurement operations must be terminal",
        operationId: nonTerminal.id,
      },
    };
  }

  return { ok: true };
}
