import type { GateName, Operation } from "../../features/circuit/model/types";

export type TwoQubitGate = "cx" | "cz" | "swap";
export type ParameterizedGate = "rx" | "ry" | "rz" | "u";

export interface PendingTwoQubitPlacement {
  readonly gate: TwoQubitGate;
  readonly sourceQubit: number;
  readonly layer: number;
}

const SUPPORTED_GATES: readonly GateName[] = [
  "x",
  "y",
  "z",
  "h",
  "s",
  "sdg",
  "t",
  "tdg",
  "i",
  "rx",
  "ry",
  "rz",
  "u",
  "cx",
  "cz",
  "swap",
  "m",
];

export const PARAMETER_LABELS: Readonly<Record<ParameterizedGate, readonly string[]>> = {
  rx: ["theta"],
  ry: ["theta"],
  rz: ["theta"],
  u: ["theta", "phi", "lambda"],
};

export function isSupportedGate(value: string): value is GateName {
  return SUPPORTED_GATES.includes(value as GateName);
}

export function isTwoQubitGate(gate: GateName): gate is TwoQubitGate {
  return gate === "cx" || gate === "cz" || gate === "swap";
}

export function isParameterizedGate(gate: GateName): gate is ParameterizedGate {
  return gate === "rx" || gate === "ry" || gate === "rz" || gate === "u";
}

export function getDefaultParams(gate: GateName): readonly number[] | undefined {
  if (gate === "rx" || gate === "ry" || gate === "rz") {
    return [0];
  }
  if (gate === "u") {
    return [0, 0, 0];
  }
  return undefined;
}

export function buildSingleQubitOperation(gate: GateName, qubit: number, layer: number) {
  return {
    gate,
    layer,
    targets: [qubit],
    params: getDefaultParams(gate),
  };
}

export function buildTwoQubitOperation(
  pending: PendingTwoQubitPlacement,
  targetQubit: number,
) {
  if (pending.gate === "swap") {
    return {
      gate: pending.gate,
      layer: pending.layer,
      targets: [pending.sourceQubit, targetQubit],
    };
  }
  return {
    gate: pending.gate,
    layer: pending.layer,
    controls: [pending.sourceQubit],
    targets: [targetQubit],
  };
}

export function getParameterValues(operation: Operation): readonly number[] {
  if (!isParameterizedGate(operation.gate)) {
    return [];
  }
  if (operation.params && operation.params.length > 0) {
    return operation.params;
  }
  return getDefaultParams(operation.gate) ?? [];
}
