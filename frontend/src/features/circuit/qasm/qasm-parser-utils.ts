import type { GateName, Operation } from "../model/types";
import { createQasmParseError, type QasmParseError } from "./qasm-errors";
import {
  GATE_SPECS,
  OPERAND_RE,
  type GateSpec,
  type ParseException,
  type RegisterState,
  type StatementLine,
} from "./qasm-parser-types";

export function throwParseException(error: QasmParseError): never {
  throw { error } satisfies ParseException;
}

function stripComment(line: string): string {
  const commentIndex = line.indexOf("//");
  if (commentIndex === -1) {
    return line;
  }
  return line.slice(0, commentIndex);
}

export function parseStatementLines(source: string): StatementLine[] {
  const statements: StatementLine[] = [];
  const lines = source.split(/\r?\n/);

  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const noComment = stripComment(rawLine).trim();
    if (noComment.length === 0) {
      continue;
    }
    if (!noComment.endsWith(";")) {
      throwParseException(
        createQasmParseError(
          "INVALID_SYNTAX",
          "statement must end with ';'",
          lineNumber,
          rawLine.trim(),
        ),
      );
    }
    const statement = noComment.slice(0, -1).trim();
    if (statement.length === 0) {
      throwParseException(
        createQasmParseError("INVALID_SYNTAX", "empty statement", lineNumber, rawLine.trim()),
      );
    }
    statements.push({ line: lineNumber, statement, excerpt: rawLine.trim() });
  }

  return statements;
}

function parseNumericExpression(
  expression: string,
  line: number,
  excerpt: string,
): number {
  const trimmed = expression.trim();
  const allowed = /^[0-9piPI+\-*/().\s]+$/;
  if (!allowed.test(trimmed)) {
    throwParseException(
      createQasmParseError(
        "INVALID_PARAMETER",
        `invalid numeric expression: ${expression}`,
        line,
        excerpt,
      ),
    );
  }
  const sanitized = trimmed.replace(/\bpi\b/gi, `${Math.PI}`);
  const value = Function(`"use strict"; return (${sanitized});`)() as number;
  if (!Number.isFinite(value)) {
    throwParseException(
      createQasmParseError(
        "INVALID_PARAMETER",
        `numeric expression is not finite: ${expression}`,
        line,
        excerpt,
      ),
    );
  }
  return value;
}

export function parseParameterList(
  raw: string | undefined,
  line: number,
  excerpt: string,
): number[] {
  if (raw === undefined || raw.trim().length === 0) {
    return [];
  }
  return raw.split(",").map((item) => parseNumericExpression(item, line, excerpt));
}

export function parseOperandIndex(
  rawOperand: string,
  qubit: RegisterState,
  line: number,
  excerpt: string,
): number {
  const match = rawOperand.trim().match(OPERAND_RE);
  if (!match) {
    throwParseException(
      createQasmParseError("INVALID_OPERAND", `invalid operand: ${rawOperand}`, line, excerpt),
    );
  }

  const registerName = match[1];
  const index = Number.parseInt(match[2], 10);
  if (registerName !== qubit.name || index >= qubit.size) {
    throwParseException(
      createQasmParseError(
        "INVALID_OPERAND",
        `operand out of range or register mismatch: ${rawOperand}`,
        line,
        excerpt,
      ),
    );
  }
  return index;
}

function toAliasGateSpec(
  gate: GateName,
  params: number[],
): { gate: GateName; params: number[]; spec: GateSpec } {
  return {
    gate,
    params,
    spec: { gate, paramCount: 3, operandCount: 1, controlCount: 0 },
  };
}

export function resolveGate(
  gateRaw: string,
  params: number[],
  line: number,
  excerpt: string,
): { gate: GateName; params: number[]; spec: GateSpec } {
  const lower = gateRaw.toLowerCase();
  if (lower === "u1") {
    return toAliasGateSpec("u", [0, 0, ...params]);
  }
  if (lower === "u2") {
    return toAliasGateSpec("u", [Math.PI / 2, ...params]);
  }
  if (lower === "u3") {
    return toAliasGateSpec("u", params);
  }

  const spec = GATE_SPECS[lower];
  if (!spec) {
    throwParseException(
      createQasmParseError("UNSUPPORTED_GATE", `unsupported gate: ${gateRaw}`, line, excerpt),
    );
  }
  return { gate: spec.gate, params, spec };
}

export function toOperation(
  gate: GateName,
  spec: GateSpec,
  params: number[],
  operandIndexes: number[],
  opIndex: number,
): Operation {
  if (spec.controlCount > 0) {
    const controls = operandIndexes.slice(0, spec.controlCount);
    const targets = operandIndexes.slice(spec.controlCount);
    return {
      id: `op-${opIndex}`,
      gate,
      layer: opIndex - 1,
      controls,
      targets,
      params: params.length > 0 ? params : undefined,
    };
  }

  if (gate === "swap") {
    return {
      id: `op-${opIndex}`,
      gate,
      layer: opIndex - 1,
      targets: [operandIndexes[0], operandIndexes[1]],
    };
  }

  return {
    id: `op-${opIndex}`,
    gate,
    layer: opIndex - 1,
    targets: [operandIndexes[0]],
    params: params.length > 0 ? params : undefined,
  };
}
