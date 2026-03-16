export function applyControlledX(
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

export function applyControlledZ(
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

export function applyControlledPhase(
  real: Float64Array,
  imag: Float64Array,
  numQubits: number,
  control: number,
  target: number,
  theta: number,
): void {
  const dimension = 1 << numQubits;
  const controlMask = 1 << control;
  const targetMask = 1 << target;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  for (let basis = 0; basis < dimension; basis += 1) {
    if ((basis & controlMask) !== 0 && (basis & targetMask) !== 0) {
      const nextReal = real[basis] * cos - imag[basis] * sin;
      const nextImag = real[basis] * sin + imag[basis] * cos;
      real[basis] = nextReal;
      imag[basis] = nextImag;
    }
  }
}

export function applyDoubleControlledX(
  real: Float64Array,
  imag: Float64Array,
  numQubits: number,
  controlA: number,
  controlB: number,
  target: number,
): void {
  const dimension = 1 << numQubits;
  const controlMaskA = 1 << controlA;
  const controlMaskB = 1 << controlB;
  const targetMask = 1 << target;

  for (let basis = 0; basis < dimension; basis += 1) {
    if (
      (basis & controlMaskA) === 0 ||
      (basis & controlMaskB) === 0 ||
      (basis & targetMask) !== 0
    ) {
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

export function applySwap(
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

