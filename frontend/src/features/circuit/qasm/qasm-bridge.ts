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

function serializeOperation(operation: Operation): string {
  switch (operation.gate) {
    case "i":
    case "x":
    case "y":
    case "z":
    case "h":
    case "s":
    case "sdg":
    case "t":
    case "tdg": {
      const [target] = requireTargets(operation, 1);
      return `${operation.gate} q[${target}];`;
    }
    case "rx":
    case "ry":
    case "rz": {
      const [target] = requireTargets(operation, 1);
      const [theta] = requireParams(operation, 1);
      return `${operation.gate}(${formatNumber(theta)}) q[${target}];`;
    }
    case "p": {
      const [target] = requireTargets(operation, 1);
      const [lambda] = requireParams(operation, 1);
      return `p(${formatNumber(lambda)}) q[${target}];`;
    }
    case "u": {
      const [target] = requireTargets(operation, 1);
      const [theta, phi, lambda] = requireParams(operation, 3);
      return `u(${formatNumber(theta)}, ${formatNumber(phi)}, ${formatNumber(lambda)}) q[${target}];`;
    }
    case "cx":
    case "cz": {
      if (!operation.controls || operation.controls.length !== 1) {
        throw new Error(`gate ${operation.gate} expects 1 control`);
      }
      const [target] = requireTargets(operation, 1);
      return `${operation.gate} q[${operation.controls[0]}], q[${target}];`;
    }
    case "cp": {
      if (!operation.controls || operation.controls.length !== 1) {
        throw new Error(`gate ${operation.gate} expects 1 control`);
      }
      const [target] = requireTargets(operation, 1);
      const [lambda] = requireParams(operation, 1);
      return `cp(${formatNumber(lambda)}) q[${operation.controls[0]}], q[${target}];`;
    }
    case "ccx": {
      if (!operation.controls || operation.controls.length !== 2) {
        throw new Error(`gate ${operation.gate} expects 2 controls`);
      }
      const [target] = requireTargets(operation, 1);
      return `ccx q[${operation.controls[0]}], q[${operation.controls[1]}], q[${target}];`;
    }
    case "swap": {
      const [left, right] = requireTargets(operation, 2);
      return `swap q[${left}], q[${right}];`;
    }
    case "m": {
      const [target] = requireTargets(operation, 1);
      return `c[${target}] = measure q[${target}];`;
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
    lines.push(serializeOperation(operation));
  }

  return `${lines.join("\n")}\n`;
}

export function fromQasm3(source: string): ParseQasmResult {
  return parseQasm3(source);
}
