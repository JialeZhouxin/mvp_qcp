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
  readonly controlled: boolean;
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
  i: { gate: "i", paramCount: 0, operandCount: 1, controlled: false },
  x: { gate: "x", paramCount: 0, operandCount: 1, controlled: false },
  y: { gate: "y", paramCount: 0, operandCount: 1, controlled: false },
  z: { gate: "z", paramCount: 0, operandCount: 1, controlled: false },
  h: { gate: "h", paramCount: 0, operandCount: 1, controlled: false },
  s: { gate: "s", paramCount: 0, operandCount: 1, controlled: false },
  sdg: { gate: "sdg", paramCount: 0, operandCount: 1, controlled: false },
  t: { gate: "t", paramCount: 0, operandCount: 1, controlled: false },
  tdg: { gate: "tdg", paramCount: 0, operandCount: 1, controlled: false },
  rx: { gate: "rx", paramCount: 1, operandCount: 1, controlled: false },
  ry: { gate: "ry", paramCount: 1, operandCount: 1, controlled: false },
  rz: { gate: "rz", paramCount: 1, operandCount: 1, controlled: false },
  u: { gate: "u", paramCount: 3, operandCount: 1, controlled: false },
  cx: { gate: "cx", paramCount: 0, operandCount: 2, controlled: true },
  cnot: { gate: "cx", paramCount: 0, operandCount: 2, controlled: true },
  cz: { gate: "cz", paramCount: 0, operandCount: 2, controlled: true },
  swap: { gate: "swap", paramCount: 0, operandCount: 2, controlled: false },
};

