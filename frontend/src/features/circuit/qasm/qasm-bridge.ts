import type { CircuitModel, Operation } from "../model/types";
import { parseQasm3 } from "./qasm-parser";
import type { ParseQasmResult } from "./qasm-parser-types";

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  return Number(value.toFixed(12)).toString();
}

function requireTargets(operation: Operation, count: number): number[] {
  if (operation.targets.length !== count) {
    throw new Error(`gate ${operation.gate} expects ${count} targets`);
  }
  return [...operation.targets];
}

function requireParams(operation: Operation, count: number): number[] {
  if (!operation.params || operation.params.length !== count) {
    throw new Error(`gate ${operation.gate} expects ${count} parameters`);
  }
  return [...operation.params];
}

function requireControls(operation: Operation, count: number): number[] {
  if (!operation.controls || operation.controls.length !== count) {
    throw new Error(`gate ${operation.gate} expects ${count} controls`);
  }
  return [...operation.controls];
}

function serializeRzz(theta: number, left: number, right: number): string[] {
  return [
    `cx q[${left}], q[${right}];`,
    `rz(${formatNumber(theta)}) q[${right}];`,
    `cx q[${left}], q[${right}];`,
  ];
}

function serializeOperation(operation: Operation): string[] {
  switch (operation.gate) {
    case "i":
    case "x":
    case "y":
    case "z":
    case "h":
    case "sx":
    case "s":
    case "sdg":
    case "t":
    case "tdg": {
      const [target] = requireTargets(operation, 1);
      return [`${operation.gate} q[${target}];`];
    }
    case "sy": {
      const [target] = requireTargets(operation, 1);
      return [`ry(${formatNumber(Math.PI / 2)}) q[${target}];`];
    }
    case "rx":
    case "ry":
    case "rz": {
      const [target] = requireTargets(operation, 1);
      const [theta] = requireParams(operation, 1);
      return [`${operation.gate}(${formatNumber(theta)}) q[${target}];`];
    }
    case "p": {
      const [target] = requireTargets(operation, 1);
      const [lambda] = requireParams(operation, 1);
      return [`p(${formatNumber(lambda)}) q[${target}];`];
    }
    case "u": {
      const [target] = requireTargets(operation, 1);
      const [theta, phi, lambda] = requireParams(operation, 3);
      return [`u(${formatNumber(theta)}, ${formatNumber(phi)}, ${formatNumber(lambda)}) q[${target}];`];
    }
    case "cx":
    case "cy":
    case "ch":
    case "cz": {
      const [control] = requireControls(operation, 1);
      const [target] = requireTargets(operation, 1);
      return [`${operation.gate} q[${control}], q[${target}];`];
    }
    case "cp": {
      const [control] = requireControls(operation, 1);
      const [target] = requireTargets(operation, 1);
      const [lambda] = requireParams(operation, 1);
      return [`cp(${formatNumber(lambda)}) q[${control}], q[${target}];`];
    }
    case "ccx": {
      const [firstControl, secondControl] = requireControls(operation, 2);
      const [target] = requireTargets(operation, 1);
      return [`ccx q[${firstControl}], q[${secondControl}], q[${target}];`];
    }
    case "ccz": {
      const [firstControl, secondControl] = requireControls(operation, 2);
      const [target] = requireTargets(operation, 1);
      return [
        `h q[${target}];`,
        `ccx q[${firstControl}], q[${secondControl}], q[${target}];`,
        `h q[${target}];`,
      ];
    }
    case "swap": {
      const [left, right] = requireTargets(operation, 2);
      return [`swap q[${left}], q[${right}];`];
    }
    case "cswap": {
      const [control] = requireControls(operation, 1);
      const [left, right] = requireTargets(operation, 2);
      return [`cswap q[${control}], q[${left}], q[${right}];`];
    }
    case "rzz": {
      const [left, right] = requireTargets(operation, 2);
      const [theta] = requireParams(operation, 1);
      return serializeRzz(theta, left, right);
    }
    case "rxx": {
      const [left, right] = requireTargets(operation, 2);
      const [theta] = requireParams(operation, 1);
      return [
        `h q[${left}];`,
        `h q[${right}];`,
        ...serializeRzz(theta, left, right),
        `h q[${left}];`,
        `h q[${right}];`,
      ];
    }
    case "ryy": {
      const [left, right] = requireTargets(operation, 2);
      const [theta] = requireParams(operation, 1);
      return [
        `sdg q[${left}];`,
        `sdg q[${right}];`,
        `h q[${left}];`,
        `h q[${right}];`,
        ...serializeRzz(theta, left, right),
        `h q[${left}];`,
        `h q[${right}];`,
        `s q[${left}];`,
        `s q[${right}];`,
      ];
    }
    case "rzx": {
      const [left, right] = requireTargets(operation, 2);
      const [theta] = requireParams(operation, 1);
      return [
        `h q[${right}];`,
        ...serializeRzz(theta, left, right),
        `h q[${right}];`,
      ];
    }
    case "m": {
      const [target] = requireTargets(operation, 1);
      return [`c[${target}] = measure q[${target}];`];
    }
    default:
      throw new Error(`unsupported gate for serialization: ${operation.gate}`);
  }
}

function sortByLayer(operations: readonly Operation[]): Operation[] {
  return [...operations].sort((left, right) => {
    if (left.layer !== right.layer) {
      return left.layer - right.layer;
    }
    return left.id.localeCompare(right.id);
  });
}

export function toQasm3(model: CircuitModel): string {
  const lines = [
    "OPENQASM 3;",
    'include "stdgates.inc";',
    `qubit[${model.numQubits}] q;`,
    `bit[${model.numQubits}] c;`,
  ];

  for (const operation of sortByLayer(model.operations)) {
    lines.push(...serializeOperation(operation));
  }

  return `${lines.join("\n")}\n`;
}

export function fromQasm3(source: string): ParseQasmResult {
  return parseQasm3(source);
}
