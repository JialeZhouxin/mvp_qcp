import type { CircuitModel, Operation } from "../model/types";
import type { LocalizedMessage } from "../ui/message-catalog";
import { WORKBENCH_COPY } from "../ui/copy-catalog";
import { getParameterValues, isParameterizedGate } from "./canvas-gate-utils";
import type { PendingPlacement } from "./canvas-gate-utils";

const INLINE_PARAM_PRECISION = 2;
const SINGLE_GATE_BODY_WIDTH_PX = 30;
const SYMBOLIC_RECT_GATE_BODY_WIDTH_PX = 34;
const MULTI_GATE_BODY_WIDTH_PX = 48;
const PARAMETERIZED_GATE_BODY_WIDTH_PX = 52;

function formatInlineParam(value: number): string {
  return value.toFixed(INLINE_PARAM_PRECISION);
}

function formatGateParams(operation: Operation): string {
  return getParameterValues(operation).map(formatInlineParam).join(",");
}

function formatGateText(operation: Operation): string {
  const gate = operation.gate === "sy" ? "√Y" : operation.gate.toUpperCase();
  if (!isParameterizedGate(operation.gate)) {
    return gate;
  }
  const paramText = formatGateParams(operation);
  return `${gate}(${paramText})`;
}

function getGateLabelLines(operation: Operation): readonly string[] {
  const gate = operation.gate === "sy" ? "√Y" : operation.gate.toUpperCase();
  if (!isParameterizedGate(operation.gate)) {
    return [gate];
  }
  return [gate, `(${formatGateParams(operation)})`];
}

export function includesQubit(operation: Operation, qubit: number): boolean {
  return operation.targets.includes(qubit) || operation.controls?.includes(qubit) === true;
}

export function findOperationAtCell(
  operations: readonly Operation[],
  qubit: number,
  layer: number,
): Operation | undefined {
  return operations.find(
    (operation) => operation.layer === layer && includesQubit(operation, qubit),
  );
}

function getTouchedQubits(operation: Operation): readonly number[] {
  return [...operation.targets, ...(operation.controls ?? [])];
}

export interface ConnectorSpan {
  readonly operationId: string;
  readonly layer: number;
  readonly minQubit: number;
  readonly maxQubit: number;
}

function getControlText(operation: Operation): string {
  if (!operation.controls || operation.controls.length === 0) {
    return "";
  }
  return operation.controls.map((value) => `c${value}`).join(",");
}

function getOperationDetailLabel(operation: Operation): string {
  const shortLabel = formatGateText(operation);
  if (operation.controls && operation.controls.length > 0) {
    if (operation.targets.length === 2) {
      return `${shortLabel} ${getControlText(operation)} -> q${operation.targets[0]} <-> q${operation.targets[1]}`;
    }
    return `${shortLabel} ${getControlText(operation)} -> t${operation.targets[0]}`;
  }
  if (operation.targets.length === 2) {
    return `${shortLabel} q${operation.targets[0]} <-> q${operation.targets[1]}`;
  }
  return `${shortLabel} q${operation.targets[0]}`;
}

function getSymbolRole(operation: Operation, qubit: number) {
  const isControl = operation.controls?.includes(qubit) === true;
  const isTarget = operation.targets.includes(qubit);

  if (isControl) {
    return {
      label: "\u25cf",
      className: "canvas-gate-box--symbol-control",
      roleText: "control",
    };
  }

  if ((operation.gate === "swap" || operation.gate === "cswap") && isTarget) {
    return {
      label: "\u00d7",
      className: "canvas-gate-box--symbol-swap",
      roleText: "swap endpoint",
    };
  }

  if (!isTarget) {
    return null;
  }

  if (operation.gate === "cx" || operation.gate === "ccx") {
    return {
      label: "\u2295",
      className: "canvas-gate-box--symbol-target-x",
      roleText: "target [X]",
    };
  }

  if (operation.gate === "cy") {
    return {
      label: "[Y]",
      className: "canvas-gate-box--symbol-target-y",
      roleText: "target [Y]",
    };
  }

  if (operation.gate === "ch") {
    return {
      label: "[H]",
      className: "canvas-gate-box--symbol-target-h",
      roleText: "target [H]",
    };
  }

  if (operation.gate === "cz" || operation.gate === "ccz") {
    return {
      label: "[Z]",
      className: "canvas-gate-box--symbol-target-z",
      roleText: "target [Z]",
    };
  }

  if (operation.gate === "cp") {
    const [lambda] = getParameterValues(operation);
    const inlinePhaseLabel = `P(${formatInlineParam(lambda)})`;
    return {
      label: inlinePhaseLabel,
      className: "canvas-gate-box--symbol-target-p",
      roleText: `target [${inlinePhaseLabel}]`,
    };
  }

  return null;
}

export function isMultiQubitOperation(operation: Operation): boolean {
  return getTouchedQubits(operation).length > 1;
}

export function estimateGateBodyWidthPx(operation: Operation): number {
  if (
    operation.gate === "cx" ||
    operation.gate === "ccx" ||
    operation.gate === "swap" ||
    operation.gate === "cswap"
  ) {
    return SINGLE_GATE_BODY_WIDTH_PX;
  }
  if (
    operation.gate === "cy" ||
    operation.gate === "ch" ||
    operation.gate === "cz" ||
    operation.gate === "cp" ||
    operation.gate === "ccz"
  ) {
    return SYMBOLIC_RECT_GATE_BODY_WIDTH_PX;
  }
  if (isParameterizedGate(operation.gate)) {
    return PARAMETERIZED_GATE_BODY_WIDTH_PX;
  }
  if (isMultiQubitOperation(operation)) {
    return MULTI_GATE_BODY_WIDTH_PX;
  }
  return SINGLE_GATE_BODY_WIDTH_PX;
}

export function getConnectorSegment(
  operation: Operation,
  qubit: number,
): "start" | "middle" | "end" | null {
  const touched = getTouchedQubits(operation);
  if (touched.length < 2) {
    return null;
  }

  const minQubit = Math.min(...touched);
  const maxQubit = Math.max(...touched);
  if (qubit < minQubit || qubit > maxQubit) {
    return null;
  }
  if (qubit === minQubit) {
    return "start";
  }
  if (qubit === maxQubit) {
    return "end";
  }
  return "middle";
}

export function findConnectorOperationAtCell(
  operations: readonly Operation[],
  qubit: number,
  layer: number,
): Operation | undefined {
  return operations.find((operation) => {
    if (operation.layer !== layer || !isMultiQubitOperation(operation)) {
      return false;
    }
    return getConnectorSegment(operation, qubit) !== null;
  });
}

export function toConnectorSpan(operation: Operation): ConnectorSpan | null {
  const touched = getTouchedQubits(operation);
  if (touched.length < 2) {
    return null;
  }
  return {
    operationId: operation.id,
    layer: operation.layer,
    minQubit: Math.min(...touched),
    maxQubit: Math.max(...touched),
  };
}

export function buildConnectorSpans(operations: readonly Operation[]): readonly ConnectorSpan[] {
  return operations
    .map(toConnectorSpan)
    .filter((span): span is ConnectorSpan => span !== null);
}

export function computeLayerCount(circuit: CircuitModel, minLayers: number): number {
  const maxLayer = circuit.operations.reduce(
    (max, operation) => Math.max(max, operation.layer),
    -1,
  );
  return Math.max(minLayers, maxLayer + 4);
}

export function toPendingPlacementMessage(pending: PendingPlacement): LocalizedMessage {
  const selected = pending.selectedQubits.map((qubit) => `q${qubit}`).join(", ");
  return {
    title: "\u7ee7\u7eed\u653e\u7f6e\u91cf\u5b50\u95e8",
    detail: `\u5df2\u9009\u62e9 ${pending.gate.toUpperCase()} \u7684 ${pending.selectedQubits.length}/${pending.requiredQubits} \u4e2a\u6bd4\u7279\uff1a${selected}`,
    suggestion:
      "\u70b9\u51fb\u540c\u4e00\u5c42\u7684\u5176\u4ed6\u7ebf\u8def\u5b8c\u6210\u653e\u7f6e\uff0c\u6216\u70b9\u51fb\u53d6\u6d88\u3002",
  };
}

export function GateLabel({ operation, qubit }: { operation: Operation; qubit: number }) {
  const shortLabel = formatGateText(operation);
  const detailLabel = getOperationDetailLabel(operation);
  const symbolRole = getSymbolRole(operation, qubit);
  const accessibleLabel = symbolRole ? `${detailLabel} (${symbolRole.roleText})` : detailLabel;
  const labelLines = symbolRole ? [symbolRole.label] : getGateLabelLines(operation);

  const variantClassName = (() => {
    if (operation.gate === "m") {
      return "canvas-gate-box--measurement";
    }
    if (symbolRole) {
      return `canvas-gate-box--symbolic ${symbolRole.className}`;
    }
    if (isMultiQubitOperation(operation)) {
      return "canvas-gate-box--multi";
    }
    if (isParameterizedGate(operation.gate)) {
      return "canvas-gate-box--parameterized";
    }
    return "canvas-gate-box--single";
  })();

  return (
    <span
      className={`canvas-gate-box ${variantClassName}`}
      title={accessibleLabel}
      aria-label={accessibleLabel}
    >
      <span className={`canvas-gate-text ${labelLines.length > 1 ? "canvas-gate-text--stacked" : ""}`}>
        {labelLines.map((line, index) => (
          <span key={`${shortLabel}-${index}`} className="canvas-gate-text-line">
            {line}
          </span>
        ))}
      </span>
    </span>
  );
}

export function MessageBlock({ message }: { message: LocalizedMessage }) {
  return (
    <div data-testid="canvas-message" style={{ marginBottom: 8, color: "var(--accent-danger)" }}>
      <strong>{message.title}</strong>
      <p style={{ margin: "4px 0 0 0" }}>{message.detail}</p>
      {message.suggestion ? (
        <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)" }}>
          {WORKBENCH_COPY.canvas.suggestion}: {message.suggestion}
        </p>
      ) : null}
    </div>
  );
}
