import type { CircuitModel, GateName, Operation } from "./types";

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

