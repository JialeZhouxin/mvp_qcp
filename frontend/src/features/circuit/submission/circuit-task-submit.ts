import type { CircuitModel, Operation } from "../model/types";

const SHOTS = 1024;
const KEY_PREFIX = "workbench-v1";

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  return Number(value.toFixed(12)).toString();
}

function sortOperations(operations: readonly Operation[]): Operation[] {
  return [...operations].sort((left, right) => {
    if (left.layer !== right.layer) {
      return left.layer - right.layer;
    }
    return left.id.localeCompare(right.id);
  });
}

function requireTargets(operation: Operation, expectedCount: number): number[] {
  if (operation.targets.length !== expectedCount) {
    throw new Error(`gate ${operation.gate} expects ${expectedCount} targets`);
  }
  return [...operation.targets];
}

function requireParams(operation: Operation, expectedCount: number): number[] {
  if (!operation.params || operation.params.length !== expectedCount) {
    throw new Error(`gate ${operation.gate} expects ${expectedCount} parameters`);
  }
  return [...operation.params];
}

function requireControls(operation: Operation, expectedCount: number): number[] {
  if (!operation.controls || operation.controls.length !== expectedCount) {
    throw new Error(`gate ${operation.gate} expects ${expectedCount} control${expectedCount > 1 ? "s" : ""}`);
  }
  return [...operation.controls];
}

function buildRzLine(target: number, theta: number): string {
  return `circuit.add(gates.RZ(${target}, theta=${formatNumber(theta)}))`;
}

function buildCnotLine(control: number, target: number): string {
  return `circuit.add(gates.CNOT(${control}, ${target}))`;
}

function buildSingleQubitGateLine(operation: Operation): string {
  const [target] = requireTargets(operation, 1);
  const gateMap: Record<string, string> = {
    i: "I",
    x: "X",
    y: "Y",
    z: "Z",
    h: "H",
    s: "S",
    sdg: "SDG",
    t: "T",
    tdg: "TDG",
  };
  const gateName = gateMap[operation.gate];
  if (!gateName) {
    throw new Error(`unsupported single-qubit gate: ${operation.gate}`);
  }
  return `circuit.add(gates.${gateName}(${target}))`;
}

function buildParameterizedGateLines(operation: Operation): string[] {
  const [target] = requireTargets(operation, 1);
  if (operation.gate === "rx" || operation.gate === "ry" || operation.gate === "rz") {
    const [theta] = requireParams(operation, 1);
    const gateName = operation.gate.toUpperCase();
    return [`circuit.add(gates.${gateName}(${target}, theta=${formatNumber(theta)}))`];
  }
  if (operation.gate === "p") {
    const [lambda] = requireParams(operation, 1);
    return [buildRzLine(target, lambda)];
  }
  if (operation.gate === "u") {
    const [theta, phi, lambda] = requireParams(operation, 3);
    return [
      `circuit.add(gates.RZ(${target}, theta=${formatNumber(phi)}))`,
      `circuit.add(gates.RY(${target}, theta=${formatNumber(theta)}))`,
      `circuit.add(gates.RZ(${target}, theta=${formatNumber(lambda)}))`,
    ];
  }
  throw new Error(`unsupported parameterized gate: ${operation.gate}`);
}

function buildControlledGateLine(operation: Operation): string {
  const [control] = requireControls(operation, 1);
  const [target] = requireTargets(operation, 1);
  if (operation.gate === "cx") {
    return buildCnotLine(control, target);
  }
  if (operation.gate === "cz") {
    return `circuit.add(gates.CZ(${control}, ${target}))`;
  }
  throw new Error(`unsupported controlled gate: ${operation.gate}`);
}

function buildControlledPhaseLines(operation: Operation): string[] {
  const [control] = requireControls(operation, 1);
  const [target] = requireTargets(operation, 1);
  const [lambda] = requireParams(operation, 1);
  const halfLambda = lambda / 2;

  return [
    buildRzLine(control, halfLambda),
    buildCnotLine(control, target),
    buildRzLine(target, -halfLambda),
    buildCnotLine(control, target),
    buildRzLine(target, halfLambda),
  ];
}

function buildDoubleControlledXLines(operation: Operation): string[] {
  const [firstControl, secondControl] = requireControls(operation, 2);
  const [target] = requireTargets(operation, 1);

  return [
    `circuit.add(gates.H(${target}))`,
    buildCnotLine(secondControl, target),
    `circuit.add(gates.TDG(${target}))`,
    buildCnotLine(firstControl, target),
    `circuit.add(gates.T(${target}))`,
    buildCnotLine(secondControl, target),
    `circuit.add(gates.TDG(${target}))`,
    buildCnotLine(firstControl, target),
    `circuit.add(gates.T(${secondControl}))`,
    `circuit.add(gates.T(${target}))`,
    `circuit.add(gates.H(${target}))`,
    buildCnotLine(firstControl, secondControl),
    `circuit.add(gates.T(${firstControl}))`,
    `circuit.add(gates.TDG(${secondControl}))`,
    buildCnotLine(firstControl, secondControl),
  ];
}

function buildOperationLines(operation: Operation): string[] {
  if (operation.gate === "m") {
    const [target] = requireTargets(operation, 1);
    return [`circuit.add(gates.M(${target}))`];
  }
  if (operation.gate === "swap") {
    const [left, right] = requireTargets(operation, 2);
    return [`circuit.add(gates.SWAP(${left}, ${right}))`];
  }
  if (operation.gate === "cx" || operation.gate === "cz") {
    return [buildControlledGateLine(operation)];
  }
  if (operation.gate === "cp") {
    return buildControlledPhaseLines(operation);
  }
  if (operation.gate === "ccx") {
    return buildDoubleControlledXLines(operation);
  }
  if (
    operation.gate === "rx"
    || operation.gate === "ry"
    || operation.gate === "rz"
    || operation.gate === "u"
    || operation.gate === "p"
  ) {
    return buildParameterizedGateLines(operation);
  }
  return [buildSingleQubitGateLine(operation)];
}

function buildAutoMeasurementLine(numQubits: number): string {
  const qubits = Array.from({ length: numQubits }, (_, index) => index).join(", ");
  return `circuit.add(gates.M(${qubits}))`;
}

export function buildQiboTaskCode(model: CircuitModel): string {
  const lines: string[] = [
    "from qibo import Circuit, gates",
    "",
    `SHOTS = ${SHOTS}`,
    "",
    "def main():",
    `    circuit = Circuit(${model.numQubits})`,
    "",
  ];

  const sortedOperations = sortOperations(model.operations);
  const hasMeasurement = sortedOperations.some((operation) => operation.gate === "m");
  for (const operation of sortedOperations) {
    for (const operationLine of buildOperationLines(operation)) {
      lines.push(`    ${operationLine}`);
    }
  }
  if (!hasMeasurement) {
    lines.push(`    ${buildAutoMeasurementLine(model.numQubits)}`);
  }

  lines.push("");
  lines.push("    result = circuit(nshots=SHOTS)");
  lines.push("    counts = result.frequencies(binary=True)");
  lines.push("    return {\"counts\": dict(counts)}");
  lines.push("");
  return lines.join("\n");
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  const normalized = hash >>> 0;
  return normalized.toString(16).padStart(8, "0");
}

export function buildSubmitFingerprint(model: CircuitModel): string {
  const operations = sortOperations(model.operations).map((operation) => ({
    gate: operation.gate,
    layer: operation.layer,
    targets: [...operation.targets],
    controls: operation.controls ? [...operation.controls] : undefined,
    params: operation.params ? [...operation.params] : undefined,
  }));
  return JSON.stringify({ numQubits: model.numQubits, operations });
}

export function buildIdempotencyKey(fingerprint: string): string {
  return `${KEY_PREFIX}-${fnv1a32(fingerprint)}`;
}
