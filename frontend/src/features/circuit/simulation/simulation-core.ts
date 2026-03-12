import type { CircuitModel, Operation } from "../model/types";

type Complex = readonly [number, number];
type Matrix2 = readonly [Complex, Complex, Complex, Complex];

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

function applyControlledX(
  real: Float64Array,
  imag: Float64Array,
  numQubits: number,
  control: number,
  target: number,
): void {
  const dimension = 1 << numQubits;
  const controlMask = 1 << control;
  const targetMask = 1 << target;

  for (let basis = 0; basis < dimension; basis += 1) {
    if ((basis & controlMask) === 0 || (basis & targetMask) !== 0) {
      continue;
    }
    const paired = basis | targetMask;
    const tempReal = real[basis];
    const tempImag = imag[basis];
    real[basis] = real[paired];
    imag[basis] = imag[paired];
    real[paired] = tempReal;
    imag[paired] = tempImag;
  }
}

function applyControlledZ(
  real: Float64Array,
  imag: Float64Array,
  numQubits: number,
  control: number,
  target: number,
): void {
  const dimension = 1 << numQubits;
  const controlMask = 1 << control;
  const targetMask = 1 << target;

  for (let basis = 0; basis < dimension; basis += 1) {
    if ((basis & controlMask) !== 0 && (basis & targetMask) !== 0) {
      real[basis] = -real[basis];
      imag[basis] = -imag[basis];
    }
  }
}

function applySwap(
  real: Float64Array,
  imag: Float64Array,
  numQubits: number,
  left: number,
  right: number,
): void {
  const dimension = 1 << numQubits;
  const leftMask = 1 << left;
  const rightMask = 1 << right;

  for (let basis = 0; basis < dimension; basis += 1) {
    const leftBit = (basis & leftMask) !== 0;
    const rightBit = (basis & rightMask) !== 0;
    if (leftBit || !rightBit) {
      continue;
    }
    const paired = basis ^ leftMask ^ rightMask;
    const tempReal = real[basis];
    const tempImag = imag[basis];
    real[basis] = real[paired];
    imag[basis] = imag[paired];
    real[paired] = tempReal;
    imag[paired] = tempImag;
  }
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
  if (operation.gate === "swap") {
    applySwap(real, imag, numQubits, operation.targets[0], operation.targets[1]);
    return;
  }
  applySingleQubitMatrix(real, imag, numQubits, operation.targets[0], matrixForGate(operation));
}

function toBasisState(index: number, numQubits: number): string {
  return index.toString(2).padStart(numQubits, "0");
}

export function simulateCircuit(model: CircuitModel): Record<string, number> {
  if (model.numQubits < 1 || model.numQubits > 10) {
    throw new Error(`numQubits must be between 1 and 10, got ${model.numQubits}`);
  }

  const dimension = 1 << model.numQubits;
  const { real, imag } = createStateVector(dimension);
  const operations = [...model.operations].sort((left, right) => left.layer - right.layer);
  for (const operation of operations) {
    applyOperation(real, imag, model.numQubits, operation);
  }

  const probabilities: Record<string, number> = {};
  for (let index = 0; index < dimension; index += 1) {
    const probability = real[index] ** 2 + imag[index] ** 2;
    probabilities[toBasisState(index, model.numQubits)] = probability;
  }
  return probabilities;
}
