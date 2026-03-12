import { useEffect, useState, type DragEvent, type MouseEvent } from "react";

import {
  addOperation,
  removeOperation,
  updateOperation,
} from "../../features/circuit/model/circuit-model";
import { validateCircuitModel } from "../../features/circuit/model/circuit-validation";
import type { CircuitModel, Operation } from "../../features/circuit/model/types";
import OperationParameterPanel from "./OperationParameterPanel";
import {
  buildSingleQubitOperation,
  buildTwoQubitOperation,
  getParameterValues,
  isParameterizedGate,
  isSupportedGate,
  isTwoQubitGate,
  type PendingTwoQubitPlacement,
} from "./canvas-gate-utils";

const DEFAULT_MIN_LAYERS = 8;

interface CircuitCanvasProps {
  readonly circuit: CircuitModel;
  readonly onCircuitChange: (next: CircuitModel) => void;
  readonly minLayers?: number;
}

function includesQubit(operation: Operation, qubit: number): boolean {
  return operation.targets.includes(qubit) || operation.controls?.includes(qubit) === true;
}

function findOperationAtCell(
  operations: readonly Operation[],
  qubit: number,
  layer: number,
): Operation | undefined {
  return operations.find(
    (operation) => operation.layer === layer && includesQubit(operation, qubit),
  );
}

function computeLayerCount(circuit: CircuitModel, minLayers: number): number {
  const maxLayer = circuit.operations.reduce((max, operation) => Math.max(max, operation.layer), 0);
  return Math.max(minLayers, maxLayer + 2);
}

function GateLabel({ operation }: { operation: Operation }) {
  if (operation.controls && operation.controls.length > 0) {
    return (
      <span>
        {operation.gate.toUpperCase()} c{operation.controls[0]}{"->"}t{operation.targets[0]}
      </span>
    );
  }
  return <span>{operation.gate.toUpperCase()}</span>;
}

function CircuitCanvas({
  circuit,
  onCircuitChange,
  minLayers = DEFAULT_MIN_LAYERS,
}: CircuitCanvasProps) {
  const [pendingPlacement, setPendingPlacement] = useState<PendingTwoQubitPlacement | null>(null);
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);

  const layers = computeLayerCount(circuit, minLayers);
  const qubits = Array.from({ length: circuit.numQubits }).map((_, index) => index);
  const layerIndexes = Array.from({ length: layers }).map((_, index) => index);
  const selectedOperation = selectedOperationId
    ? circuit.operations.find((operation) => operation.id === selectedOperationId) ?? null
    : null;

  useEffect(() => {
    if (!selectedOperationId) {
      return;
    }
    const exists = circuit.operations.some((operation) => operation.id === selectedOperationId);
    if (!exists) {
      setSelectedOperationId(null);
    }
  }, [circuit.operations, selectedOperationId]);

  const commitCircuit = (next: CircuitModel): boolean => {
    const validation = validateCircuitModel(next);
    if (!validation.ok) {
      setInteractionMessage(validation.error.message);
      return false;
    }
    setInteractionMessage(null);
    onCircuitChange(next);
    return true;
  };

  const setOccupiedMessage = (qubit: number, layer: number) => {
    setInteractionMessage(`q${qubit} layer ${layer} already has an operation`);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>, qubit: number, layer: number) => {
    event.preventDefault();
    const rawGate = event.dataTransfer.getData("application/x-qcp-gate");
    if (!isSupportedGate(rawGate)) {
      return;
    }
    if (findOperationAtCell(circuit.operations, qubit, layer)) {
      setOccupiedMessage(qubit, layer);
      return;
    }

    if (isTwoQubitGate(rawGate)) {
      setPendingPlacement({ gate: rawGate, sourceQubit: qubit, layer });
      setSelectedOperationId(null);
      setInteractionMessage("请选择同一层的目标量子位完成双比特门放置");
      return;
    }

    setPendingPlacement(null);
    const next = addOperation(circuit, buildSingleQubitOperation(rawGate, qubit, layer));
    commitCircuit(next);
  };

  const onDelete = (operationId: string) => {
    const next = removeOperation(circuit, operationId);
    const committed = commitCircuit(next);
    if (committed && selectedOperationId === operationId) {
      setSelectedOperationId(null);
    }
  };

  const onCellClick = (qubit: number, layer: number) => {
    if (!pendingPlacement) {
      const operation = findOperationAtCell(circuit.operations, qubit, layer);
      setSelectedOperationId(operation?.id ?? null);
      return;
    }
    if (layer !== pendingPlacement.layer) {
      setInteractionMessage("请在与第一步相同的层选择目标量子位");
      return;
    }
    if (qubit === pendingPlacement.sourceQubit) {
      setInteractionMessage("双比特门的两个量子位不能相同");
      return;
    }
    if (findOperationAtCell(circuit.operations, qubit, layer)) {
      setOccupiedMessage(qubit, layer);
      return;
    }

    const next = addOperation(circuit, buildTwoQubitOperation(pendingPlacement, qubit));
    if (commitCircuit(next)) {
      setPendingPlacement(null);
    }
  };

  const onParamChange = (index: number, value: number) => {
    if (!selectedOperation || !isParameterizedGate(selectedOperation.gate)) {
      return;
    }
    if (!Number.isFinite(value)) {
      setInteractionMessage("gate parameter must be a finite number");
      return;
    }
    const nextParams = [...getParameterValues(selectedOperation)];
    nextParams[index] = value;
    const next = updateOperation(circuit, selectedOperation.id, { params: nextParams });
    commitCircuit(next);
  };

  const cancelPendingPlacement = () => {
    setPendingPlacement(null);
    setInteractionMessage(null);
  };

  const getCellBackground = (operation: Operation | undefined, layer: number): string => {
    if (selectedOperationId && operation?.id === selectedOperationId) {
      return "#e6f4ff";
    }
    if (operation) {
      return "#f0f7ff";
    }
    if (pendingPlacement && pendingPlacement.layer === layer) {
      return "#fffbe6";
    }
    return "#fff";
  };

  return (
    <section style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>量子线路</h3>
      {interactionMessage ? <p style={{ marginTop: 0, color: "#cf1322" }}>{interactionMessage}</p> : null}
      {pendingPlacement ? (
        <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <span>
            待放置 {pendingPlacement.gate.toUpperCase()}：源位 q{pendingPlacement.sourceQubit}，层{" "}
            {pendingPlacement.layer}
          </span>
          <button type="button" onClick={cancelPendingPlacement}>
            取消放置
          </button>
        </div>
      ) : null}
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gap: 6 }}>
          {qubits.map((qubit) => (
            <div key={qubit} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <strong style={{ width: 36 }}>q{qubit}</strong>
              {layerIndexes.map((layer) => {
                const operation = findOperationAtCell(circuit.operations, qubit, layer);
                return (
                  <div
                    key={`${qubit}-${layer}`}
                    onDrop={(event) => onDrop(event, qubit, layer)}
                    onDragOver={(event) => event.preventDefault()}
                    onClick={() => onCellClick(qubit, layer)}
                    data-testid={`canvas-cell-${qubit}-${layer}`}
                    style={{
                      width: 120,
                      minHeight: 42,
                      border: "1px dashed #bbb",
                      borderRadius: 6,
                      padding: "4px 6px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      background: getCellBackground(operation, layer),
                    }}
                  >
                    {operation ? <GateLabel operation={operation} /> : <span style={{ color: "#999" }}>-</span>}
                    {operation ? (
                      <button
                        type="button"
                        onClick={(event: MouseEvent<HTMLButtonElement>) => {
                          event.stopPropagation();
                          onDelete(operation.id);
                        }}
                        data-testid={`remove-op-${operation.id}`}
                      >
                        删除
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {selectedOperation ? (
        <section
          data-testid="operation-params-panel"
          style={{ marginTop: 12, padding: 10, borderRadius: 6, border: "1px solid #eee" }}
        >
          <h4 style={{ margin: "0 0 8px 0" }}>
            选中门: {selectedOperation.gate.toUpperCase()} (layer {selectedOperation.layer})
          </h4>
          <OperationParameterPanel operation={selectedOperation} onParamChange={onParamChange} />
        </section>
      ) : null}
    </section>
  );
}

export default CircuitCanvas;
