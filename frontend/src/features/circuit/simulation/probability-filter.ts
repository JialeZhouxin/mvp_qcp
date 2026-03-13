export interface ProbabilityFilterResult {
  readonly all: Record<string, number>;
  readonly visible: Record<string, number>;
  readonly hiddenCount: number;
  readonly totalCount: number;
  readonly visibleCount: number;
  readonly probabilitySum: number;
  readonly epsilon: number;
}

export type ProbabilityDisplayMode = "FILTERED" | "ALL";

export interface ProbabilityDisplayView {
  readonly probabilities: Record<string, number>;
  readonly visibleCount: number;
  readonly hiddenCount: number;
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
  const all: Record<string, number> = {};
  const visible: Record<string, number> = {};
  let probabilitySum = 0;

  for (const [state, value] of Object.entries(probabilities)) {
    assertProbabilityValue(state, value);
    all[state] = value;
    probabilitySum += value;
    if (value > epsilon) {
      visible[state] = value;
    }
  }

  const totalCount = Object.keys(probabilities).length;
  const visibleCount = Object.keys(visible).length;

  return {
    all,
    visible,
    hiddenCount: totalCount - visibleCount,
    totalCount,
    visibleCount,
    probabilitySum,
    epsilon,
  };
}

export function getProbabilityDisplayView(
  mode: ProbabilityDisplayMode,
  view: ProbabilityFilterResult,
): ProbabilityDisplayView {
  if (mode === "ALL") {
    return {
      probabilities: view.all,
      visibleCount: view.totalCount,
      hiddenCount: 0,
    };
  }
  return {
    probabilities: view.visible,
    visibleCount: view.visibleCount,
    hiddenCount: view.hiddenCount,
  };
}
