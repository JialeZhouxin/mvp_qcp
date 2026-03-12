export interface ProbabilityFilterResult {
  readonly visible: Record<string, number>;
  readonly hiddenCount: number;
  readonly totalCount: number;
  readonly visibleCount: number;
  readonly probabilitySum: number;
  readonly epsilon: number;
}

function assertProbabilityValue(state: string, probability: number): void {
  if (!Number.isFinite(probability)) {
    throw new Error(`probability for state ${state} must be finite`);
  }
  if (probability < 0) {
    throw new Error(`probability for state ${state} must be non-negative`);
  }
}

export function calculateEpsilon(numQubits: number): number {
  if (!Number.isInteger(numQubits) || numQubits < 1) {
    throw new Error("numQubits must be a positive integer");
  }
  return 2 ** -(numQubits + 2);
}

export function filterProbabilities(
  numQubits: number,
  probabilities: Record<string, number>,
): ProbabilityFilterResult {
  const epsilon = calculateEpsilon(numQubits);
  const visible: Record<string, number> = {};
  let probabilitySum = 0;

  for (const [state, value] of Object.entries(probabilities)) {
    assertProbabilityValue(state, value);
    probabilitySum += value;
    if (value > epsilon) {
      visible[state] = value;
    }
  }

  const totalCount = Object.keys(probabilities).length;
  const visibleCount = Object.keys(visible).length;

  return {
    visible,
    hiddenCount: totalCount - visibleCount,
    totalCount,
    visibleCount,
    probabilitySum,
    epsilon,
  };
}
