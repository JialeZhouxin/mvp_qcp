import type { CircuitModel, Operation } from "../model/types";
import type { LocalizedMessage } from "../ui/message-catalog";
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
  const gate = operation.gate.toUpperCase();
  if (!isParameterizedGate(operation.gate)) {
    return gate;
  }
  const paramText = formatGateParams(operation);
  return `${gate}(${paramText})`;
}

function getGateLabelLines(operation: Operation): readonly string[] {
  const gate = operation.gate.toUpperCase();
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

function getControlText(operation: Operation): string {
  if (!operation.controls || operation.controls.length === 0) {
    return "";
  }
  return operation.controls.map((value) => `c${value}`).join(",");
}

function getOperationDetailLabel(operation: Operation): string {
  const shortLabel = formatGateText(operation);
  if (operation.controls && operation.controls.length > 0) {
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
      label: "●",
      className: "canvas-gate-box--symbol-control",
      roleText: "control",
    };
  }

  if (operation.gate === "swap" && isTarget) {
    return {
      label: "脳",
      className: "canvas-gate-box--symbol-swap",
      roleText: "swap endpoint",
    };
  }

  if (!isTarget) {
    return null;
  }

  if (operation.gate === "cx" || operation.gate === "ccx") {
    return {
      label: "⊕",
      className: "canvas-gate-box--symbol-target-x",
      roleText: "target [X]",
    };
  }

  if (operation.gate === "cz") {
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
  if (operation.gate === "cx" || operation.gate === "ccx" || operation.gate === "swap") {
    return SINGLE_GATE_BODY_WIDTH_PX;
  }
  if (operation.gate === "cz" || operation.gate === "cp") {
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

export function computeLayerCount(circuit: CircuitModel, minLayers: number): number {
  const maxLayer = circuit.operations.reduce(
    (max, operation) => Math.max(max, operation.layer),
    0,
  );
  return Math.max(minLayers, maxLayer + 2);
}

export function toPendingPlacementMessage(pending: PendingPlacement): LocalizedMessage {
  const selected = pending.selectedQubits.map((qubit) => `q${qubit}`).join(", ");
  return {
    title: "继续放置量子门",
    detail: `已选择 ${pending.gate.toUpperCase()} 的 ${pending.selectedQubits.length}/${pending.requiredQubits} 个比特：${selected}`,
    suggestion: "点击同一层的其他线路完成放置，或点击取消。",
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
    <div data-testid="canvas-message" style={{ marginBottom: 8, color: "#cf1322" }}>
      <strong>{message.title}</strong>
      <p style={{ margin: "4px 0 0 0" }}>{message.detail}</p>
      {message.suggestion ? (
        <p style={{ margin: "4px 0 0 0", color: "#595959" }}>寤鸿: {message.suggestion}</p>
      ) : null}
    </div>
  );
}


