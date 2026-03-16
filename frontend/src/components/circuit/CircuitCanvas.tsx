import { useEffect, useState, type DragEvent, type MouseEvent } from "react";

import {
  addOperation,
  removeOperation,
  updateOperation,
} from "../../features/circuit/model/circuit-model";
import { validateCircuitModel } from "../../features/circuit/model/circuit-validation";
import type { CircuitModel, Operation } from "../../features/circuit/model/types";
import {
  type LocalizedMessage,
  toCanvasMessage,
} from "../../features/circuit/ui/message-catalog";
import OperationParameterPanel from "./OperationParameterPanel";
import {
  GateLabel,
  MessageBlock,
  computeLayerCount,
  findOperationAtCell,
  toPendingPlacementMessage,
} from "./circuit-canvas-helpers";
import {
  advancePendingPlacement,
  buildSingleQubitOperation,
  createPendingPlacement,
  getParameterValues,
  isParameterizedGate,
  isSupportedGate,
  type PendingPlacement,
} from "./canvas-gate-utils";
import "./CircuitCanvas.css";

const DEFAULT_MIN_LAYERS = 8;

interface CircuitCanvasProps {
  readonly circuit: CircuitModel;
  readonly onCircuitChange: (next: CircuitModel) => void;
  readonly minLayers?: number;
}

function CircuitCanvas({
  circuit,
  onCircuitChange,
  minLayers = DEFAULT_MIN_LAYERS,
}: CircuitCanvasProps) {
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
  const [interactionMessage, setInteractionMessage] =
    useState<LocalizedMessage | null>(null);
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
    const exists = circuit.operations.some(
      (operation) => operation.id === selectedOperationId,
    );
    if (!exists) {
      setSelectedOperationId(null);
    }
  }, [circuit.operations, selectedOperationId]);

  const commitCircuit = (next: CircuitModel): boolean => {
    const validation = validateCircuitModel(next);
    if (!validation.ok) {
      setInteractionMessage(
        toCanvasMessage("VALIDATION_ERROR", { reason: validation.error.message }),
      );
      return false;
    }
    setInteractionMessage(null);
    onCircuitChange(next);
    return true;
  };

  const setOccupiedMessage = (qubit: number, layer: number) => {
    setInteractionMessage(toCanvasMessage("CELL_OCCUPIED", { qubit, layer }));
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

    const pending = createPendingPlacement(rawGate, qubit, layer);
    if (pending) {
      setPendingPlacement(pending);
      setSelectedOperationId(null);
      if (pending.requiredQubits === 2) {
        setInteractionMessage(
          toCanvasMessage("PENDING_TWO_QUBIT", {
            gate: rawGate,
            sourceQubit: qubit,
            layer,
          }),
        );
      } else {
        setInteractionMessage(toPendingPlacementMessage(pending));
      }
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
      setInteractionMessage(toCanvasMessage("LAYER_MISMATCH"));
      return;
    }
    if (findOperationAtCell(circuit.operations, qubit, layer)) {
      setOccupiedMessage(qubit, layer);
      return;
    }

    const advanced = advancePendingPlacement(pendingPlacement, qubit);
    if (advanced.kind === "error") {
      setInteractionMessage(toCanvasMessage(advanced.code));
      return;
    }
    if (advanced.kind === "continue") {
      setPendingPlacement(advanced.pending);
      setInteractionMessage(toPendingPlacementMessage(advanced.pending));
      return;
    }

    const next = addOperation(circuit, advanced.operation);
    if (commitCircuit(next)) {
      setPendingPlacement(null);
      setInteractionMessage(null);
    }
  };

  const onParamChange = (index: number, value: number) => {
    if (!selectedOperation || !isParameterizedGate(selectedOperation.gate)) {
      return;
    }
    if (!Number.isFinite(value)) {
      setInteractionMessage(toCanvasMessage("INVALID_PARAM"));
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
    <section
      data-testid="circuit-canvas-panel"
      style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}
    >
      <h3 style={{ marginTop: 0 }}>电路画布</h3>
      {interactionMessage ? <MessageBlock message={interactionMessage} /> : null}
      {pendingPlacement ? (
        <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <span>
            待放置 {pendingPlacement.gate.toUpperCase()}：已选择 {pendingPlacement.selectedQubits.length}/
            {pendingPlacement.requiredQubits}，层 {pendingPlacement.layer}
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
                    className="canvas-cell"
                    tabIndex={operation ? 0 : undefined}
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
                        className="canvas-delete-btn"
                        aria-label="删除 gate"
                        data-testid={`remove-op-${operation.id}`}
                      >
                        ×
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
