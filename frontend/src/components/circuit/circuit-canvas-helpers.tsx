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

export function GateLabel({ operation }: { operation: Operation }) {
  let label: string;
  if (operation.controls && operation.controls.length > 0) {
    const controls = operation.controls.map((value) => `c${value}`).join(",");
    label = `${operation.gate.toUpperCase()} ${controls} -> t${operation.targets[0]}`;
  } else if (operation.targets.length === 2) {
    label = `${operation.gate.toUpperCase()} q${operation.targets[0]} <-> q${operation.targets[1]}`;
  } else {
    label = operation.gate.toUpperCase();
  }

  return (
    <span className="canvas-gate-box">
      <span className="canvas-gate-text">{label}</span>
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
