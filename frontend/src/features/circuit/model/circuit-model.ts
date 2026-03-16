import type {
  CircuitModel,
  GateName,
  Operation,
  QubitAdjustResult,
  QubitBoundary,
} from "./types";

interface AddOperationInput {
  readonly gate: GateName;
  readonly layer: number;
  readonly targets: readonly number[];
  readonly controls?: readonly number[];
  readonly params?: readonly number[];
}

interface UpdateOperationInput {
  readonly layer?: number;
  readonly targets?: readonly number[];
  readonly controls?: readonly number[];
  readonly params?: readonly number[];
}

function copyNumbers(values?: readonly number[]): readonly number[] | undefined {
  if (values === undefined) {
    return undefined;
  }
  return [...values];
}

function normalizeOperation(
  operation: Operation,
  index: number,
): Operation {
  return {
    ...operation,
    targets: [...operation.targets],
    controls: copyNumbers(operation.controls),
    params: copyNumbers(operation.params),
    layer: operation.layer,
    id: operation.id || `op-${index}`,
  };
}

function sortOperations(operations: readonly Operation[]): readonly Operation[] {
  return [...operations].sort((left, right) => {
    if (left.layer !== right.layer) {
      return left.layer - right.layer;
    }
    return left.id.localeCompare(right.id);
  });
}

export function createCircuit(numQubits: number): CircuitModel {
  return { numQubits, operations: [] };
}

export function normalizeCircuit(model: CircuitModel): CircuitModel {
  const operations = model.operations.map((operation, index) =>
    normalizeOperation(operation, index),
  );
  return {
    numQubits: model.numQubits,
    operations: sortOperations(operations),
  };
}

export function addOperation(
  model: CircuitModel,
  input: AddOperationInput,
): CircuitModel {
  const operation: Operation = {
    id: `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    gate: input.gate,
    layer: input.layer,
    targets: [...input.targets],
    controls: copyNumbers(input.controls),
    params: copyNumbers(input.params),
  };
  return normalizeCircuit({
    ...model,
    operations: [...model.operations, operation],
  });
}

export function removeOperation(
  model: CircuitModel,
  operationId: string,
): CircuitModel {
  return normalizeCircuit({
    ...model,
    operations: model.operations.filter((operation) => operation.id !== operationId),
  });
}

export function updateOperation(
  model: CircuitModel,
  operationId: string,
  input: UpdateOperationInput,
): CircuitModel {
  const operations = model.operations.map((operation) => {
    if (operation.id !== operationId) {
      return operation;
    }
    return {
      ...operation,
      layer: input.layer ?? operation.layer,
      targets: input.targets ? [...input.targets] : operation.targets,
      controls: input.controls ? [...input.controls] : operation.controls,
      params: input.params ? [...input.params] : operation.params,
    };
  });
  return normalizeCircuit({ ...model, operations });
}

export function getCircuitDepth(model: CircuitModel): number {
  if (model.operations.length === 0) {
    return 0;
  }
  const maxLayer = model.operations.reduce(
    (currentMax, operation) => Math.max(currentMax, operation.layer),
    0,
  );
  return maxLayer + 1;
}

export function getTotalGates(model: CircuitModel): number {
  return model.operations.length;
}

function touchesQubitBeyond(operation: Operation, nextQubitCount: number): boolean {
  const touched = [...operation.targets, ...(operation.controls ?? [])];
  return touched.some((qubit) => qubit >= nextQubitCount);
}

export function increaseQubits(
  model: CircuitModel,
  boundary: QubitBoundary,
): QubitAdjustResult {
  if (model.numQubits >= boundary.maxQubits) {
    return {
      ok: false,
      code: "QUBIT_MAX_REACHED",
      message: `qubits ${model.numQubits} already reached max ${boundary.maxQubits}`,
    };
  }
  return {
    ok: true,
    model: normalizeCircuit({
      ...model,
      numQubits: model.numQubits + 1,
    }),
  };
}

export function decreaseQubits(
  model: CircuitModel,
  boundary: QubitBoundary,
): QubitAdjustResult {
  if (model.numQubits <= boundary.minQubits) {
    return {
      ok: false,
      code: "QUBIT_MIN_REACHED",
      message: `qubits ${model.numQubits} already reached min ${boundary.minQubits}`,
    };
  }

  const nextQubitCount = model.numQubits - 1;
  const blockingOperation = model.operations.find((operation) =>
    touchesQubitBeyond(operation, nextQubitCount),
  );
  if (blockingOperation) {
    return {
      ok: false,
      code: "QUBIT_SHRINK_BLOCKED_BY_OPERATION",
      message: `operation ${blockingOperation.id} touches qubit >= ${nextQubitCount}`,
      operationId: blockingOperation.id,
    };
  }

  return {
    ok: true,
    model: normalizeCircuit({
      ...model,
      numQubits: nextQubitCount,
    }),
  };
}
