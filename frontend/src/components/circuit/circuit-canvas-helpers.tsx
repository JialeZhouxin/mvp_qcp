import type { CircuitModel, Operation } from "../../features/circuit/model/types";
import type { LocalizedMessage } from "../../features/circuit/ui/message-catalog";
import type { PendingPlacement } from "./canvas-gate-utils";

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
  const shortLabel = operation.gate.toUpperCase();
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
      label: "×",
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
      roleText: "target ⊕",
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
    return {
      label: "[P(λ)]",
      className: "canvas-gate-box--symbol-target-p",
      roleText: "target [P(lambda)]",
    };
  }

  return null;
}

export function isMultiQubitOperation(operation: Operation): boolean {
  return getTouchedQubits(operation).length > 1;
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
    title: "继续选择量子位",
    detail: `正在放置 ${pending.gate.toUpperCase()}，已选择 ${pending.selectedQubits.length}/${pending.requiredQubits}（${selected}）`,
    suggestion: "请在同一层点击其他空白量子位完成放置。",
  };
}

export function GateLabel({ operation, qubit }: { operation: Operation; qubit: number }) {
  const shortLabel = operation.gate.toUpperCase();
  const detailLabel = getOperationDetailLabel(operation);
  const symbolRole = getSymbolRole(operation, qubit);
  const accessibleLabel = symbolRole ? `${detailLabel} (${symbolRole.roleText})` : detailLabel;

  const variantClassName = (() => {
    if (operation.gate === "m") {
      return "canvas-gate-box--measurement";
    }
    if (symbolRole) {
      return `canvas-gate-box--multi canvas-gate-box--symbolic ${symbolRole.className}`;
    }
    if (isMultiQubitOperation(operation)) {
      return "canvas-gate-box--multi";
    }
    return "canvas-gate-box--single";
  })();

  return (
    <span
      className={`canvas-gate-box ${variantClassName}`}
      title={accessibleLabel}
      aria-label={accessibleLabel}
    >
      <span className="canvas-gate-text">{symbolRole ? symbolRole.label : shortLabel}</span>
    </span>
  );
}

export function MessageBlock({ message }: { message: LocalizedMessage }) {
  return (
    <div data-testid="canvas-message" style={{ marginBottom: 8, color: "#cf1322" }}>
      <strong>{message.title}</strong>
      <p style={{ margin: "4px 0 0 0" }}>{message.detail}</p>
      {message.suggestion ? (
        <p style={{ margin: "4px 0 0 0", color: "#595959" }}>建议: {message.suggestion}</p>
      ) : null}
    </div>
  );
}
