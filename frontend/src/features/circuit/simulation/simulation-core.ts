import type { CircuitModel, Operation } from "../model/types";
import {
  applyControlledPhase,
  applyControlledX,
  applyControlledZ,
  applyDoubleControlledX,
  applySwap,
} from "./simulation-controlled";

type Complex = readonly [number, number];
type Matrix2 = readonly [Complex, Complex, Complex, Complex];

export interface BlochVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface SimulationAnalysis {
  readonly probabilities: Record<string, number>;
  readonly blochVectors: readonly BlochVector[];
}

function createStateVector(size: number): { real: Float64Array; imag: Float64Array } {
  const real = new Float64Array(size);
  const imag = new Float64Array(size);
  real[0] = 1;
  return { real, imag };
}

function complexMul(ar: number, ai: number, br: number, bi: number): Complex {
  return [ar * br - ai * bi, ar * bi + ai * br];
}

function complexAdd(
  ar: number,
  ai: number,
  br: number,
  bi: number,
): Complex {
  return [ar + br, ai + bi];
}

function applySingleQubitMatrix(
  real: Float64Array,
  imag: Float64Array,
  numQubits: number,
  target: number,
  matrix: Matrix2,
): void {
  const dimension = 1 << numQubits;
  const mask = 1 << target;

  for (let basis = 0; basis < dimension; basis += 1) {
    if ((basis & mask) !== 0) {
      continue;
    }
    const paired = basis | mask;
    const a0r = real[basis];
    const a0i = imag[basis];
    const a1r = real[paired];
    const a1i = imag[paired];

    const [m00r, m00i] = matrix[0];
    const [m01r, m01i] = matrix[1];
    const [m10r, m10i] = matrix[2];
    const [m11r, m11i] = matrix[3];

    const [leftMul0r, leftMul0i] = complexMul(m00r, m00i, a0r, a0i);
    const [leftMul1r, leftMul1i] = complexMul(m01r, m01i, a1r, a1i);
    const [rightMul0r, rightMul0i] = complexMul(m10r, m10i, a0r, a0i);
    const [rightMul1r, rightMul1i] = complexMul(m11r, m11i, a1r, a1i);

    const [next0r, next0i] = complexAdd(leftMul0r, leftMul0i, leftMul1r, leftMul1i);
    const [next1r, next1i] = complexAdd(rightMul0r, rightMul0i, rightMul1r, rightMul1i);
    real[basis] = next0r;
    imag[basis] = next0i;
    real[paired] = next1r;
    imag[paired] = next1i;
  }
}

function matrixForFixedGate(gate: Operation["gate"]): Matrix2 | null {
  const sqrt2 = Math.sqrt(2);
  switch (gate) {
    case "i":
      return [[1, 0], [0, 0], [0, 0], [1, 0]];
    case "x":
      return [[0, 0], [1, 0], [1, 0], [0, 0]];
    case "y":
      return [[0, 0], [0, -1], [0, 1], [0, 0]];
    case "z":
      return [[1, 0], [0, 0], [0, 0], [-1, 0]];
    case "h":
      return [[1 / sqrt2, 0], [1 / sqrt2, 0], [1 / sqrt2, 0], [-1 / sqrt2, 0]];
    case "s":
      return [[1, 0], [0, 0], [0, 0], [0, 1]];
    case "sdg":
      return [[1, 0], [0, 0], [0, 0], [0, -1]];
    case "t": {
      const phase = Math.PI / 4;
      return [[1, 0], [0, 0], [0, 0], [Math.cos(phase), Math.sin(phase)]];
    }
    case "tdg": {
      const phase = -Math.PI / 4;
      return [[1, 0], [0, 0], [0, 0], [Math.cos(phase), Math.sin(phase)]];
    }
    default:
      return null;
  }
}

function matrixForParamGate(operation: Operation): Matrix2 {
  switch (operation.gate) {
    case "rx": {
      const theta = operation.params?.[0] ?? 0;
      const c = Math.cos(theta / 2);
      const s = Math.sin(theta / 2);
      return [[c, 0], [0, -s], [0, -s], [c, 0]];
    }
    case "ry": {
      const theta = operation.params?.[0] ?? 0;
      const c = Math.cos(theta / 2);
      const s = Math.sin(theta / 2);
      return [[c, 0], [-s, 0], [s, 0], [c, 0]];
    }
    case "rz": {
      const theta = operation.params?.[0] ?? 0;
      const left = -theta / 2;
      const right = theta / 2;
      return [
        [Math.cos(left), Math.sin(left)],
        [0, 0],
        [0, 0],
        [Math.cos(right), Math.sin(right)],
      ];
    }
    case "u": {
      const [theta, phi, lambda] = operation.params ?? [0, 0, 0];
      const c = Math.cos(theta / 2);
      const s = Math.sin(theta / 2);
      return [
        [c, 0],
        [-Math.cos(lambda) * s, -Math.sin(lambda) * s],
        [Math.cos(phi) * s, Math.sin(phi) * s],
        [Math.cos(phi + lambda) * c, Math.sin(phi + lambda) * c],
      ];
    }
    case "p": {
      const lambda = operation.params?.[0] ?? 0;
      return [[1, 0], [0, 0], [0, 0], [Math.cos(lambda), Math.sin(lambda)]];
    }
    default:
      throw new Error(`unsupported single-qubit gate ${operation.gate}`);
  }
}

function matrixForGate(operation: Operation): Matrix2 {
  const fixed = matrixForFixedGate(operation.gate);
  if (fixed) {
    return fixed;
  }
  return matrixForParamGate(operation);
}

function applyOperation(
  real: Float64Array,
  imag: Float64Array,
  numQubits: number,
  operation: Operation,
): void {
  if (operation.gate === "m") {
    return;
  }
  if (operation.gate === "cx") {
    applyControlledX(real, imag, numQubits, operation.controls?.[0] ?? 0, operation.targets[0]);
    return;
  }
  if (operation.gate === "cz") {
    applyControlledZ(real, imag, numQubits, operation.controls?.[0] ?? 0, operation.targets[0]);
    return;
  }
  if (operation.gate === "cp") {
    applyControlledPhase(
      real,
      imag,
      numQubits,
      operation.controls?.[0] ?? 0,
      operation.targets[0],
      operation.params?.[0] ?? 0,
    );
    return;
  }
  if (operation.gate === "ccx") {
    applyDoubleControlledX(
      real,
      imag,
      numQubits,
      operation.controls?.[0] ?? 0,
      operation.controls?.[1] ?? 1,
      operation.targets[0],
    );
    return;
  }
  if (operation.gate === "swap") {
    applySwap(real, imag, numQubits, operation.targets[0], operation.targets[1]);
    return;
  }
  applySingleQubitMatrix(real, imag, numQubits, operation.targets[0], matrixForGate(operation));
}

function toBasisState(index: number, numQubits: number): string {
  return index.toString(2).padStart(numQubits, "0");
}

function buildProbabilities(
  real: Float64Array,
  imag: Float64Array,
  numQubits: number,
): Record<string, number> {
  const dimension = 1 << numQubits;
  const probabilities: Record<string, number> = {};

  for (let index = 0; index < dimension; index += 1) {
    probabilities[toBasisState(index, numQubits)] = real[index] ** 2 + imag[index] ** 2;
  }

  return probabilities;
}

function buildBlochVectors(
  real: Float64Array,
  imag: Float64Array,
  numQubits: number,
): readonly BlochVector[] {
  const dimension = 1 << numQubits;
  const vectors: BlochVector[] = [];

  for (let qubit = 0; qubit < numQubits; qubit += 1) {
    const mask = 1 << qubit;
    let x = 0;
    let y = 0;
    let z = 0;

    for (let basis = 0; basis < dimension; basis += 1) {
      if ((basis & mask) !== 0) {
        continue;
      }

      const paired = basis | mask;
      const alphaReal = real[basis];
      const alphaImag = imag[basis];
      const betaReal = real[paired];
      const betaImag = imag[paired];

      x += 2 * (alphaReal * betaReal + alphaImag * betaImag);
      y += 2 * (alphaReal * betaImag - alphaImag * betaReal);
      z += alphaReal ** 2 + alphaImag ** 2 - betaReal ** 2 - betaImag ** 2;
    }

    vectors.push({ x, y, z });
  }

  return vectors;
}

export function simulateCircuitAnalysis(model: CircuitModel): SimulationAnalysis {
  if (model.numQubits < 1 || model.numQubits > 10) {
    throw new Error(`numQubits must be between 1 and 10, got ${model.numQubits}`);
  }

  const dimension = 1 << model.numQubits;
  const { real, imag } = createStateVector(dimension);
  const operations = [...model.operations].sort((left, right) => left.layer - right.layer);
  for (const operation of operations) {
    applyOperation(real, imag, model.numQubits, operation);
  }

  return {
    probabilities: buildProbabilities(real, imag, model.numQubits),
    blochVectors: buildBlochVectors(real, imag, model.numQubits),
  };
}

export function simulateCircuit(model: CircuitModel): Record<string, number> {
  return simulateCircuitAnalysis(model).probabilities;
}
