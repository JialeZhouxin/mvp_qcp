import type { CircuitModel, Operation } from "../model/types";

function cloneOperation(operation: Operation): Operation {
  return {
    ...operation,
    targets: [...operation.targets],
    controls: operation.controls ? [...operation.controls] : undefined,
    params: operation.params ? [...operation.params] : undefined,
  };
}

function sortOperationsForSimulation(operations: readonly Operation[]): readonly Operation[] {
  return [...operations].sort((left, right) => {
    if (left.layer !== right.layer) {
      return left.layer - right.layer;
    }
    return left.id.localeCompare(right.id);
  });
}

function clampStep(step: number, totalGates: number): number {
  return Math.max(0, Math.min(step, totalGates));
}

export function sliceCircuitBySimulationStep(
  circuit: CircuitModel,
  simulationStep: number,
): CircuitModel {
  const orderedOperations = sortOperationsForSimulation(circuit.operations);
  const boundedStep = clampStep(simulationStep, orderedOperations.length);

  return {
    numQubits: circuit.numQubits,
    operations: orderedOperations.slice(0, boundedStep).map(cloneOperation),
  };
}

export function getFutureOperationIdsAtSimulationStep(
  circuit: CircuitModel,
  simulationStep: number,
): readonly string[] {
  const orderedOperations = sortOperationsForSimulation(circuit.operations);
  const boundedStep = clampStep(simulationStep, orderedOperations.length);
  return orderedOperations.slice(boundedStep).map((operation) => operation.id);
}

export function clampSimulationStepOnCircuitChange(
  previousStep: number,
  previousTotalGates: number,
  nextTotalGates: number,
): number {
  const safePreviousStep = clampStep(previousStep, previousTotalGates);
  if (safePreviousStep === previousTotalGates) {
    return nextTotalGates;
  }
  return Math.min(safePreviousStep, nextTotalGates);
}
