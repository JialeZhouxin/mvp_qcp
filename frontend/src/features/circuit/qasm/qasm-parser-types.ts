import type { CircuitModel, GateName } from "../model/types";
import type { QasmParseError } from "./qasm-errors";

export interface ParseSuccess {
  readonly ok: true;
  readonly model: CircuitModel;
}

export interface ParseFailure {
  readonly ok: false;
  readonly error: QasmParseError;
}

export type ParseQasmResult = ParseSuccess | ParseFailure;

export interface StatementLine {
  readonly line: number;
  readonly statement: string;
  readonly excerpt: string;
}

export interface RegisterState {
  readonly name: string;
  readonly size: number;
}

export interface GateSpec {
  readonly gate: GateName;
  readonly paramCount: number;
  readonly operandCount: number;
  readonly controlCount: number;
}

export interface ParseException {
  readonly error: QasmParseError;
}

export const HEADER_RE = /^OPENQASM\s+3$/i;
export const INCLUDE_RE = /^include\s+"stdgates\.inc"$/i;
export const QUBIT_DECL_RE = /^qubit\[(\d+)\]\s+([A-Za-z_]\w*)$/;
export const BIT_DECL_RE = /^bit\[(\d+)\]\s+([A-Za-z_]\w*)$/;
export const MEASURE_RE = /^([A-Za-z_]\w*)\[(\d+)\]\s*=\s*measure\s+([A-Za-z_]\w*)\[(\d+)\]$/i;
export const GATE_RE = /^([A-Za-z_]\w*)(?:\(([^)]*)\))?\s+(.+)$/;
export const OPERAND_RE = /^([A-Za-z_]\w*)\[(\d+)\]$/;

export const GATE_SPECS: Record<string, GateSpec> = {
  i: { gate: "i", paramCount: 0, operandCount: 1, controlCount: 0 },
  x: { gate: "x", paramCount: 0, operandCount: 1, controlCount: 0 },
  y: { gate: "y", paramCount: 0, operandCount: 1, controlCount: 0 },
  z: { gate: "z", paramCount: 0, operandCount: 1, controlCount: 0 },
  h: { gate: "h", paramCount: 0, operandCount: 1, controlCount: 0 },
  sx: { gate: "sx", paramCount: 0, operandCount: 1, controlCount: 0 },
  s: { gate: "s", paramCount: 0, operandCount: 1, controlCount: 0 },
  sdg: { gate: "sdg", paramCount: 0, operandCount: 1, controlCount: 0 },
  t: { gate: "t", paramCount: 0, operandCount: 1, controlCount: 0 },
  tdg: { gate: "tdg", paramCount: 0, operandCount: 1, controlCount: 0 },
  rx: { gate: "rx", paramCount: 1, operandCount: 1, controlCount: 0 },
  ry: { gate: "ry", paramCount: 1, operandCount: 1, controlCount: 0 },
  rz: { gate: "rz", paramCount: 1, operandCount: 1, controlCount: 0 },
  u: { gate: "u", paramCount: 3, operandCount: 1, controlCount: 0 },
  p: { gate: "p", paramCount: 1, operandCount: 1, controlCount: 0 },
  cx: { gate: "cx", paramCount: 0, operandCount: 2, controlCount: 1 },
  cnot: { gate: "cx", paramCount: 0, operandCount: 2, controlCount: 1 },
  cy: { gate: "cy", paramCount: 0, operandCount: 2, controlCount: 1 },
  ch: { gate: "ch", paramCount: 0, operandCount: 2, controlCount: 1 },
  cp: { gate: "cp", paramCount: 1, operandCount: 2, controlCount: 1 },
  cz: { gate: "cz", paramCount: 0, operandCount: 2, controlCount: 1 },
  ccx: { gate: "ccx", paramCount: 0, operandCount: 3, controlCount: 2 },
  swap: { gate: "swap", paramCount: 0, operandCount: 2, controlCount: 0 },
  cswap: { gate: "cswap", paramCount: 0, operandCount: 3, controlCount: 1 },
};
