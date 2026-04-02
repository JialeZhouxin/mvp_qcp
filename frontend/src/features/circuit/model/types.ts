export type GateName =
  | "i"
  | "x"
  | "y"
  | "z"
  | "h"
  | "sx"
  | "sy"
  | "s"
  | "sdg"
  | "t"
  | "tdg"
  | "rx"
  | "ry"
  | "rz"
  | "u"
  | "p"
  | "cx"
  | "cy"
  | "ch"
  | "cp"
  | "cz"
  | "ccx"
  | "ccz"
  | "swap"
  | "cswap"
  | "rxx"
  | "ryy"
  | "rzz"
  | "rzx"
  | "m";

export interface Operation {
  readonly id: string;
  readonly gate: GateName;
  readonly targets: readonly number[];
  readonly controls?: readonly number[];
  readonly params?: readonly number[];
  readonly layer: number;
}

export interface CircuitModel {
  readonly numQubits: number;
  readonly operations: readonly Operation[];
}

export interface QubitBoundary {
  readonly minQubits: number;
  readonly maxQubits: number;
}

export type QubitAdjustErrorCode =
  | "QUBIT_MIN_REACHED"
  | "QUBIT_MAX_REACHED"
  | "QUBIT_SHRINK_BLOCKED_BY_OPERATION";

export type QubitAdjustResult =
  | { readonly ok: true; readonly model: CircuitModel }
  | {
      readonly ok: false;
      readonly code: QubitAdjustErrorCode;
      readonly message: string;
      readonly operationId?: string;
    };

export type ColumnDeleteErrorCode =
  | "COLUMN_DELETE_INVALID_RANGE"
  | "COLUMN_DELETE_BLOCKED_BY_OPERATION";

export type DeleteEmptyColumnsResult =
  | { readonly ok: true; readonly model: CircuitModel }
  | {
      readonly ok: false;
      readonly code: ColumnDeleteErrorCode;
      readonly message: string;
      readonly blockingLayer?: number;
      readonly operationId?: string;
    };

export type ComplexityErrorCode =
  | "QUBIT_LIMIT_EXCEEDED"
  | "DEPTH_LIMIT_EXCEEDED"
  | "GATE_LIMIT_EXCEEDED";

export interface ComplexityReport {
  readonly ok: boolean;
  readonly qubits: number;
  readonly depth: number;
  readonly totalGates: number;
  readonly code?: ComplexityErrorCode;
  readonly message?: string;
}
