export type QasmParseErrorCode =
  | "MISSING_HEADER"
  | "MISSING_DECLARATION"
  | "INVALID_SYNTAX"
  | "INVALID_CIRCUIT"
  | "INVALID_PARAMETER"
  | "INVALID_OPERAND"
  | "UNSUPPORTED_STATEMENT"
  | "UNSUPPORTED_GATE";

export interface QasmParseError {
  readonly code: QasmParseErrorCode;
  readonly message: string;
  readonly line: number;
  readonly column: number;
  readonly excerpt: string;
}

export function createQasmParseError(
  code: QasmParseErrorCode,
  message: string,
  line: number,
  excerpt: string,
  column = 1,
): QasmParseError {
  return {
    code,
    message,
    line,
    column,
    excerpt,
  };
}
