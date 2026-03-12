import type { Operation } from "../model/types";
import { validateCircuitModel } from "../model/circuit-validation";
import { createQasmParseError } from "./qasm-errors";
import {
  parseOperandIndex,
  parseParameterList,
  parseStatementLines,
  resolveGate,
  throwParseException,
  toOperation,
} from "./qasm-parser-utils";
import {
  BIT_DECL_RE,
  GATE_RE,
  HEADER_RE,
  INCLUDE_RE,
  MEASURE_RE,
  QUBIT_DECL_RE,
  type ParseException,
  type ParseQasmResult,
  type RegisterState,
  type StatementLine,
} from "./qasm-parser-types";

interface OperationSourceMap {
  readonly lineByOperationId: ReadonlyMap<string, StatementLine>;
}

function parseDeclaration(
  statement: string,
): { qubit: RegisterState | null; bit: RegisterState | null } {
  const qubitMatch = statement.match(QUBIT_DECL_RE);
  if (qubitMatch) {
    return {
      qubit: {
        size: Number.parseInt(qubitMatch[1], 10),
        name: qubitMatch[2],
      },
      bit: null,
    };
  }
  const bitMatch = statement.match(BIT_DECL_RE);
  if (bitMatch) {
    return {
      qubit: null,
      bit: {
        size: Number.parseInt(bitMatch[1], 10),
        name: bitMatch[2],
      },
    };
  }
  return { qubit: null, bit: null };
}

function parseMeasureStatement(
  item: StatementLine,
  qubit: RegisterState,
  bit: RegisterState | null,
  operationIndex: number,
) {
  const match = item.statement.match(MEASURE_RE);
  if (!match) {
    return null;
  }

  const cName = match[1];
  const cIndex = Number.parseInt(match[2], 10);
  const qName = match[3];
  const qIndex = Number.parseInt(match[4], 10);

  if (bit && (cName !== bit.name || cIndex >= bit.size)) {
    throwParseException(
      createQasmParseError("INVALID_OPERAND", "invalid classical bit target", item.line, item.excerpt),
    );
  }
  if (qName !== qubit.name || qIndex >= qubit.size) {
    throwParseException(
      createQasmParseError("INVALID_OPERAND", "invalid measurement qubit target", item.line, item.excerpt),
    );
  }
  return {
    id: `op-${operationIndex}`,
    gate: "m" as const,
    layer: operationIndex - 1,
    targets: [qIndex],
  };
}

function ensureHeaderAndQubit(
  hasHeader: boolean,
  qubit: RegisterState | null,
  item: StatementLine,
): RegisterState {
  if (!hasHeader) {
    throwParseException(
      createQasmParseError("MISSING_HEADER", "OPENQASM 3 header is required", item.line, item.excerpt),
    );
  }
  if (!qubit) {
    throwParseException(
      createQasmParseError(
        "MISSING_DECLARATION",
        "qubit register declaration is required",
        item.line,
        item.excerpt,
      ),
    );
  }
  return qubit;
}

function parseGateStatement(
  item: StatementLine,
  qubit: RegisterState,
  operationIndex: number,
) {
  const gateMatch = item.statement.match(GATE_RE);
  if (!gateMatch) {
    throwParseException(
      createQasmParseError("UNSUPPORTED_STATEMENT", "unsupported statement", item.line, item.excerpt),
    );
  }

  const rawGate = gateMatch[1];
  const params = parseParameterList(gateMatch[2], item.line, item.excerpt);
  const resolved = resolveGate(rawGate, params, item.line, item.excerpt);
  if (resolved.params.length !== resolved.spec.paramCount) {
    throwParseException(
      createQasmParseError(
        "INVALID_PARAMETER",
        `gate ${rawGate} expects ${resolved.spec.paramCount} parameters`,
        item.line,
        item.excerpt,
      ),
    );
  }

  const operands = gateMatch[3].split(",").map((segment) => segment.trim());
  if (operands.length !== resolved.spec.operandCount) {
    throwParseException(
      createQasmParseError(
        "INVALID_OPERAND",
        `gate ${rawGate} expects ${resolved.spec.operandCount} operands`,
        item.line,
        item.excerpt,
      ),
    );
  }

  const operandIndexes = operands.map((operand) =>
    parseOperandIndex(operand, qubit, item.line, item.excerpt),
  );
  return toOperation(
    resolved.gate,
    resolved.spec,
    resolved.params,
    operandIndexes,
    operationIndex,
  );
}

function toOperationSourceMap(
  linesByOperationId: Map<string, StatementLine>,
): OperationSourceMap {
  return {
    lineByOperationId: new Map(linesByOperationId),
  };
}

function toInvalidCircuitError(
  map: OperationSourceMap,
  operationId: string | undefined,
  message: string,
) {
  if (!operationId) {
    return createQasmParseError("INVALID_CIRCUIT", message, 1, "");
  }
  const source = map.lineByOperationId.get(operationId);
  if (!source) {
    return createQasmParseError("INVALID_CIRCUIT", message, 1, "");
  }
  return createQasmParseError("INVALID_CIRCUIT", message, source.line, source.excerpt);
}

function parseStatements(statements: StatementLine[]): ParseQasmResult {
  let hasHeader = false;
  let qubit: RegisterState | null = null;
  let bit: RegisterState | null = null;
  const operations: Operation[] = [];
  const linesByOperationId = new Map<string, StatementLine>();

  for (const item of statements) {
    if (HEADER_RE.test(item.statement)) {
      hasHeader = true;
      continue;
    }
    if (INCLUDE_RE.test(item.statement)) {
      continue;
    }

    const declaration = parseDeclaration(item.statement);
    if (declaration.qubit) {
      qubit = declaration.qubit;
      continue;
    }
    if (declaration.bit) {
      bit = declaration.bit;
      continue;
    }

    const activeQubit = ensureHeaderAndQubit(hasHeader, qubit, item);
    const measureOperation = parseMeasureStatement(
      item,
      activeQubit,
      bit,
      operations.length + 1,
    );
    if (measureOperation) {
      operations.push(measureOperation);
      linesByOperationId.set(measureOperation.id, item);
      continue;
    }
    const gateOperation = parseGateStatement(item, activeQubit, operations.length + 1);
    operations.push(gateOperation);
    linesByOperationId.set(gateOperation.id, item);
  }

  if (!hasHeader) {
    throwParseException(
      createQasmParseError("MISSING_HEADER", "OPENQASM 3 header is required", 1, ""),
    );
  }
  if (!qubit) {
    throwParseException(
      createQasmParseError("MISSING_DECLARATION", "qubit register declaration is required", 1, ""),
    );
  }

  const model = { numQubits: qubit.size, operations };
  const validation = validateCircuitModel(model);
  if (!validation.ok) {
    throwParseException(
      toInvalidCircuitError(
        toOperationSourceMap(linesByOperationId),
        validation.error.operationId,
        validation.error.message,
      ),
    );
  }

  return { ok: true, model };
}

export function parseQasm3(source: string): ParseQasmResult {
  try {
    const statements = parseStatementLines(source);
    return parseStatements(statements);
  } catch (error) {
    const parseException = error as ParseException;
    if (parseException?.error) {
      return { ok: false, error: parseException.error };
    }
    return {
      ok: false,
      error: createQasmParseError("INVALID_SYNTAX", "unknown parse error", 1, String(error)),
    };
  }
}

export type { ParseQasmResult };
