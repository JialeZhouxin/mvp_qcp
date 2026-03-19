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
  findConnectorOperationAtCell,
  findOperationAtCell,
  getConnectorSegment,
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
import {
  validateParameterValue,
  type ParameterValidationResult,
} from "./parameter-validation";
import { useCircuitCanvasHotkeys } from "./use-circuit-canvas-hotkeys";
import { useCircuitCanvasViewport } from "./use-circuit-canvas-viewport";
import "./CircuitCanvas.css";

const DEFAULT_MIN_LAYERS = 8;
const GATE_DRAG_MIME = "application/x-qcp-gate";
const NOOP_HANDLER = () => {};
const BELL_TEMPLATE_ID = "bell";
const SUPERPOSITION_TEMPLATE_ID = "superposition";

type CanvasTemplateId = typeof BELL_TEMPLATE_ID | typeof SUPERPOSITION_TEMPLATE_ID;

const NOOP_TEMPLATE_HANDLER = (_templateId: CanvasTemplateId) => {};

interface CircuitCanvasControls {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly currentQubits: number;
  readonly canIncreaseQubits: boolean;
  readonly canDecreaseQubits: boolean;
  readonly qubitMessage: string | null;
  readonly onIncreaseQubits: () => void;
  readonly onDecreaseQubits: () => void;
  readonly onClearCircuit: () => void;
  readonly onResetWorkbench: () => void;
  readonly onLoadTemplate: (templateId: CanvasTemplateId) => void;
}

interface CircuitCanvasProps {
  readonly circuit: CircuitModel;
  readonly onCircuitChange: (next: CircuitModel) => void;
  readonly minLayers?: number;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly controls?: CircuitCanvasControls;
}

function CircuitCanvas({
  circuit,
  onCircuitChange,
  minLayers = DEFAULT_MIN_LAYERS,
  onUndo = NOOP_HANDLER,
  onRedo = NOOP_HANDLER,
  controls,
}: CircuitCanvasProps) {
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
  const [interactionMessage, setInteractionMessage] =
    useState<LocalizedMessage | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [isGateDragging, setIsGateDragging] = useState(false);
  const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null);
  const [parameterDraft, setParameterDraft] = useState<readonly number[] | null>(null);
  const [parameterFeedback, setParameterFeedback] = useState<
    Readonly<Record<number, ParameterValidationResult>>
  >({});
  const {
    zoomPercentText,
    canZoomIn,
    canZoomOut,
    isPanReady,
    isPanning,
    viewportRef,
    viewportContentStyle,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onViewportWheel,
    onViewportPointerDown,
    onViewportPointerMove,
    onViewportPointerUp,
    onViewportPointerCancel,
  } = useCircuitCanvasViewport();
  const hasWorkbenchControls = controls !== undefined;
  const canUndoAction = controls?.canUndo ?? false;
  const canRedoAction = controls?.canRedo ?? false;
  const canIncreaseQubits = controls?.canIncreaseQubits ?? false;
  const canDecreaseQubits = controls?.canDecreaseQubits ?? false;
  const currentQubits = controls?.currentQubits ?? circuit.numQubits;
  const qubitMessage = controls?.qubitMessage ?? null;
  const onIncreaseQubits = controls?.onIncreaseQubits ?? NOOP_HANDLER;
  const onDecreaseQubits = controls?.onDecreaseQubits ?? NOOP_HANDLER;
  const onClearCircuit = controls?.onClearCircuit ?? NOOP_HANDLER;
  const onResetWorkbench = controls?.onResetWorkbench ?? NOOP_HANDLER;
  const onLoadTemplate = controls?.onLoadTemplate ?? NOOP_TEMPLATE_HANDLER;

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

  useEffect(() => {
    if (!selectedOperation || !isParameterizedGate(selectedOperation.gate)) {
      setParameterDraft(null);
      setParameterFeedback({});
      return;
    }
    setParameterDraft(getParameterValues(selectedOperation));
    setParameterFeedback({});
  }, [selectedOperationId]);

  useEffect(() => {
    const clearDragPreview = () => {
      setIsGateDragging(false);
      setHoveredCellKey(null);
    };
    window.addEventListener("dragend", clearDragPreview);
    window.addEventListener("drop", clearDragPreview);
    return () => {
      window.removeEventListener("dragend", clearDragPreview);
      window.removeEventListener("drop", clearDragPreview);
    };
  }, []);

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

  const toCellKey = (qubit: number, layer: number) => `${qubit}-${layer}`;

  const isGateDragEvent = (event: DragEvent<HTMLDivElement>): boolean => {
    const types = Array.from(event.dataTransfer?.types ?? []);
    return types.includes(GATE_DRAG_MIME);
  };

  const onDragEnterCell = (
    event: DragEvent<HTMLDivElement>,
    qubit: number,
    layer: number,
  ) => {
    event.preventDefault();
    if (!isGateDragEvent(event)) {
      return;
    }
    setIsGateDragging(true);
    setHoveredCellKey(toCellKey(qubit, layer));
  };

  const onDragOverCell = (
    event: DragEvent<HTMLDivElement>,
    qubit: number,
    layer: number,
  ) => {
    event.preventDefault();
    if (!isGateDragEvent(event)) {
      return;
    }
    setIsGateDragging(true);
    setHoveredCellKey(toCellKey(qubit, layer));
  };

  const onDragLeaveCell = (
    event: DragEvent<HTMLDivElement>,
    qubit: number,
    layer: number,
  ) => {
    if (!isGateDragEvent(event)) {
      return;
    }
    const related = event.relatedTarget;
    if (related instanceof Node && event.currentTarget.contains(related)) {
      return;
    }
    const key = toCellKey(qubit, layer);
    setHoveredCellKey((current) => (current === key ? null : current));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>, qubit: number, layer: number) => {
    event.preventDefault();
    setIsGateDragging(false);
    setHoveredCellKey(null);
    const rawGate = event.dataTransfer.getData(GATE_DRAG_MIME);
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

  const updateParameterFeedback = (index: number, result: ParameterValidationResult) => {
    setParameterFeedback((previous) => ({
      ...previous,
      [index]: result,
    }));
  };

  const onParamChange = (index: number, value: number) => {
    if (!selectedOperation || !isParameterizedGate(selectedOperation.gate)) {
      return;
    }
    if (!parameterDraft || index < 0 || index >= parameterDraft.length) {
      return;
    }

    const result = validateParameterValue(value);
    updateParameterFeedback(index, result);

    if (result.level === "error") {
      setInteractionMessage(toCanvasMessage("INVALID_PARAM"));
      return;
    }

    const nextParams = [...parameterDraft];
    nextParams[index] = value;
    setParameterDraft(nextParams);
    const next = updateOperation(circuit, selectedOperation.id, { params: nextParams });
    commitCircuit(next);
  };

  const onNormalizeParam = (index: number) => {
    const current = parameterFeedback[index];
    if (!current || current.level !== "warning" || current.normalizedValue === null) {
      return;
    }
    onParamChange(index, current.normalizedValue);
  };

  const isInlineAnchorCell = (operation: Operation, qubit: number): boolean => {
    const touchedQubits = [...operation.targets, ...(operation.controls ?? [])];
    const anchorQubit = Math.min(...touchedQubits);
    return qubit === anchorQubit;
  };

  const activeParameterValues =
    selectedOperation && isParameterizedGate(selectedOperation.gate)
      ? parameterDraft ?? getParameterValues(selectedOperation)
      : [];

  const cancelPendingPlacement = () => {
    setPendingPlacement(null);
    setInteractionMessage(null);
  };

  useCircuitCanvasHotkeys({
    selectedOperationId,
    onUndo,
    onRedo,
    onDeleteSelected: () => {
      if (!selectedOperationId) {
        return;
      }
      onDelete(selectedOperationId);
    },
  });

  const getCellClassName = (
    operation: Operation | undefined,
    qubit: number,
    layer: number,
  ) => {
    const connectorOperation = findConnectorOperationAtCell(circuit.operations, qubit, layer);
    const connectorSegment =
      connectorOperation &&
      (!operation || operation.id === connectorOperation.id)
        ? getConnectorSegment(connectorOperation, qubit)
        : null;
    const key = toCellKey(qubit, layer);
    const isSelected = selectedOperationId !== null && operation?.id === selectedOperationId;
    const isConnectorSelected =
      selectedOperationId !== null && connectorOperation?.id === selectedOperationId;
    const isHovered = hoveredCellKey === key;
    const classNames = ["canvas-cell"];

    if (operation) {
      classNames.push("canvas-cell--occupied");
      if (isSelected) {
        classNames.push("canvas-cell--selected");
      } else if (isGateDragging) {
        classNames.push("canvas-cell--blocked");
      }
    } else {
      classNames.push("canvas-cell--empty");
      if (pendingPlacement && pendingPlacement.layer === layer) {
        classNames.push("canvas-cell--pending-layer");
      }
      if (isGateDragging) {
        classNames.push("canvas-cell--drop-target");
        if (isHovered) {
          classNames.push("canvas-cell--drop-hover");
        }
      }
    }

    if (connectorSegment) {
      classNames.push("canvas-cell--connector", `canvas-cell--connector-${connectorSegment}`);
      if (isConnectorSelected) {
        classNames.push("canvas-cell--connector-selected");
      }
    }

    return classNames.join(" ");
  };
  const viewportClassName = [
    "canvas-viewport",
    isPanning ? "canvas-viewport--panning" : "",
    !isPanning && isPanReady ? "canvas-viewport--pan-ready" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
      <div className="canvas-workbench-toolbar" data-testid="canvas-workbench-toolbar">
        {hasWorkbenchControls ? (
          <div className="canvas-workbench-group" data-testid="canvas-workbench-actions">
            <button type="button" className="canvas-workbench-btn" onClick={onUndo} disabled={!canUndoAction}>
              撤销
            </button>
            <button type="button" className="canvas-workbench-btn" onClick={onRedo} disabled={!canRedoAction}>
              重做
            </button>
            <button type="button" className="canvas-workbench-btn" onClick={onClearCircuit}>
              清空电路
            </button>
            <button type="button" className="canvas-workbench-btn" onClick={onResetWorkbench}>
              重置工作台
            </button>
          </div>
        ) : null}
        {hasWorkbenchControls ? (
          <div className="canvas-workbench-group" data-testid="canvas-workbench-qubits">
            <span className="canvas-workbench-label">Qubits</span>
            <button
              type="button"
              className="canvas-workbench-btn canvas-workbench-btn--small"
              onClick={onDecreaseQubits}
              disabled={!canDecreaseQubits}
            >
              -Qubit
            </button>
            <span className="canvas-workbench-value" data-testid="canvas-qubit-count">
              {currentQubits}
            </span>
            <button
              type="button"
              className="canvas-workbench-btn canvas-workbench-btn--small"
              onClick={onIncreaseQubits}
              disabled={!canIncreaseQubits}
            >
              +Qubit
            </button>
          </div>
        ) : null}
        {hasWorkbenchControls ? (
          <div className="canvas-workbench-group" data-testid="canvas-workbench-templates">
            <span className="canvas-workbench-label">模板</span>
            <button
              type="button"
              className="canvas-workbench-btn"
              onClick={() => onLoadTemplate(BELL_TEMPLATE_ID)}
            >
              Bell 态
            </button>
            <button
              type="button"
              className="canvas-workbench-btn"
              onClick={() => onLoadTemplate(SUPERPOSITION_TEMPLATE_ID)}
            >
              均匀叠加态
            </button>
          </div>
        ) : null}
        <div
          className="canvas-workbench-group canvas-workbench-group--zoom"
          data-testid="canvas-zoom-toolbar"
        >
          <span className="canvas-zoom-percent" data-testid="canvas-zoom-percent">
            {zoomPercentText}
          </span>
          <button
            type="button"
            className="canvas-workbench-btn canvas-workbench-btn--small"
            data-testid="canvas-zoom-out"
            onClick={onZoomOut}
            disabled={!canZoomOut}
            aria-label="缩小画布"
          >
            -
          </button>
          <button
            type="button"
            className="canvas-workbench-btn canvas-workbench-btn--small"
            data-testid="canvas-zoom-in"
            onClick={onZoomIn}
            disabled={!canZoomIn}
            aria-label="放大画布"
          >
            +
          </button>
          <button
            type="button"
            className="canvas-workbench-btn canvas-workbench-btn--small"
            data-testid="canvas-zoom-reset"
            onClick={onZoomReset}
            aria-label="重置画布缩放"
          >
            100%
          </button>
        </div>
      </div>
      {hasWorkbenchControls && qubitMessage ? (
        <p style={{ margin: "0 0 8px 0", color: "#cf1322" }} data-testid="qubit-message">
          {qubitMessage}
        </p>
      ) : null}
      <div
        ref={viewportRef}
        className={viewportClassName}
        onWheel={onViewportWheel}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerCancel={onViewportPointerCancel}
        data-testid="canvas-viewport"
      >
        <div className="canvas-grid" style={viewportContentStyle}>
          {qubits.map((qubit) => (
            <div key={qubit} className="canvas-row" data-testid={`canvas-row-${qubit}`}>
              <strong className="canvas-row-label">q{qubit}</strong>
              <div className="canvas-row-track" data-testid={`canvas-row-track-${qubit}`}>
                <span
                  className="canvas-row-wire"
                  data-testid={`canvas-row-wire-${qubit}`}
                  aria-hidden="true"
                />
                {layerIndexes.map((layer) => {
                const operation = findOperationAtCell(circuit.operations, qubit, layer);
                const isSelectedOperation =
                  selectedOperationId !== null && operation?.id === selectedOperationId;
                return (
                  <div
                    key={`${qubit}-${layer}`}
                    onDrop={(event) => onDrop(event, qubit, layer)}
                    onDragEnter={(event) => onDragEnterCell(event, qubit, layer)}
                    onDragOver={(event) => onDragOverCell(event, qubit, layer)}
                    onDragLeave={(event) => onDragLeaveCell(event, qubit, layer)}
                    onClick={() => onCellClick(qubit, layer)}
                    className={getCellClassName(operation, qubit, layer)}
                    tabIndex={operation ? 0 : undefined}
                    data-testid={`canvas-cell-${qubit}-${layer}`}
                  >
                    {operation ? (
                      <GateLabel operation={operation} qubit={qubit} />
                    ) : (
                      <span className="canvas-empty-placeholder">-</span>
                    )}
                    {operation &&
                    isSelectedOperation &&
                    isParameterizedGate(operation.gate) &&
                    isInlineAnchorCell(operation, qubit) ? (
                      <div
                        style={{
                          position: "absolute",
                          left: "calc(100% + 8px)",
                          top: "50%",
                          transform: "translateY(-50%)",
                          zIndex: 3,
                          width: 220,
                          padding: 8,
                          borderRadius: 6,
                          border: "1px solid #d9e2ec",
                          background: "#fff",
                          boxShadow: "0 6px 18px rgba(15, 23, 42, 0.12)",
                        }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <OperationParameterPanel
                          operation={operation}
                          values={activeParameterValues}
                          feedback={parameterFeedback}
                          onParamChange={onParamChange}
                          onNormalizeParam={onNormalizeParam}
                          compact
                          testId="inline-operation-params-panel"
                        />
                      </div>
                    ) : null}
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
          <OperationParameterPanel
            operation={selectedOperation}
            values={activeParameterValues}
            feedback={parameterFeedback}
            onParamChange={onParamChange}
            onNormalizeParam={onNormalizeParam}
          />
        </section>
      ) : null}
    </section>
  );
}

export default CircuitCanvas;
