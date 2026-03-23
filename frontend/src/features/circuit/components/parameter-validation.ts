export type ParameterValidationLevel = "none" | "warning" | "error";

export interface ParameterValidationResult {
  readonly level: ParameterValidationLevel;
  readonly message: string | null;
  readonly normalizedValue: number | null;
}

const SOFT_BOUNDARY_FACTOR = 2;
const SOFT_BOUNDARY_MIN = -SOFT_BOUNDARY_FACTOR * Math.PI;
const SOFT_BOUNDARY_MAX = SOFT_BOUNDARY_FACTOR * Math.PI;

function normalizeToSoftBoundary(value: number): number {
  const width = SOFT_BOUNDARY_MAX - SOFT_BOUNDARY_MIN;
  const shifted = value - SOFT_BOUNDARY_MIN;
  const wrapped = ((shifted % width) + width) % width;
  return SOFT_BOUNDARY_MIN + wrapped;
}

export function validateParameterValue(value: number): ParameterValidationResult {
  if (!Number.isFinite(value)) {
    return {
      level: "error",
      message: "Parameter must be a finite number.",
      normalizedValue: null,
    };
  }

  if (value < SOFT_BOUNDARY_MIN || value > SOFT_BOUNDARY_MAX) {
    const normalized = normalizeToSoftBoundary(value);
    return {
      level: "warning",
      message: "Suggested range is [-2pi, 2pi]; current value is out of range.",
      normalizedValue: normalized,
    };
  }

  return {
    level: "none",
    message: null,
    normalizedValue: null,
  };
}

