import { type DragEvent } from "react";

import type { CircuitModel } from "../model/types";
import OperationParameterPanel from "./OperationParameterPanel";
import CircuitCanvasViewport from "./CircuitCanvasViewport";
import { MessageBlock } from "./circuit-canvas-helpers";
import CircuitCanvasToolbar from "./CircuitCanvasToolbar";
import { useCircuitCanvasDragEvents } from "./use-circuit-canvas-drag-events";
import { useCircuitCanvasHotkeys } from "./use-circuit-canvas-hotkeys";
import { useCircuitCanvasInteractions } from "./use-circuit-canvas-interactions";
import { useCircuitCanvasViewport } from "./use-circuit-canvas-viewport";
import "./CircuitCanvas.css";

const DEFAULT_MIN_LAYERS = 15;
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
  readonly simulationStep?: number | null;
  readonly totalSimulationSteps?: number | null;
  readonly onSimulationStepChange?: (step: number) => void;
  readonly futureOperationIds?: readonly string[];
}

function CircuitCanvas({
  circuit,
  onCircuitChange,
  minLayers = DEFAULT_MIN_LAYERS,
  onUndo = NOOP_HANDLER,
  onRedo = NOOP_HANDLER,
  controls,
  simulationStep = null,
  totalSimulationSteps = null,
  onSimulationStepChange = NOOP_HANDLER,
  futureOperationIds = [],
}: CircuitCanvasProps) {
  const {
    pendingPlacement,
    interactionMessage,
    selectedOperationId,
    selectedOperation,
    parameterFeedback,
    activeParameterValues,
    qubits,
    layerIndexes,
    layerCellWidths,
    showGateDragPreview,
    clearHoveredCell,
    onDropGate,
    onCellClick,
    onDelete,
    onParamChange,
    onNormalizeParam,
    cancelPendingPlacement,
    getCellClassName,
  } = useCircuitCanvasInteractions({
    circuit,
    onCircuitChange,
    minLayers,
    futureOperationIds: new Set(futureOperationIds),
  });
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
  const {
    onDragEnterCell,
    onDragOverCell,
    onDragLeaveCell,
    onDropCell,
  } = useCircuitCanvasDragEvents({
    showGateDragPreview,
    clearHoveredCell,
    onDropGate,
  });
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

  const viewportClassName = [
    "canvas-viewport",
    isPanning ? "canvas-viewport--panning" : "",
    !isPanning && isPanReady ? "canvas-viewport--pan-ready" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section data-testid="circuit-canvas-panel" className="circuit-canvas-panel">
      <h3 className="circuit-canvas-panel__title">{"\u7535\u8def\u753b\u5e03"}</h3>
      {interactionMessage ? <MessageBlock message={interactionMessage} /> : null}
      {pendingPlacement ? (
        <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <span>
            {"\u5f85\u653e\u7f6e"} {pendingPlacement.gate.toUpperCase()}
            {"\uff1a\u5df2\u9009\u62e9"} {pendingPlacement.selectedQubits.length}/
            {pendingPlacement.requiredQubits}
            {"\uff0c\u5c42 "}
            {pendingPlacement.layer}
          </span>
          <button type="button" onClick={cancelPendingPlacement}>
            {"\u53d6\u6d88\u653e\u7f6e"}
          </button>
        </div>
      ) : null}
      <CircuitCanvasToolbar
        hasWorkbenchControls={hasWorkbenchControls}
        simulationStep={simulationStep}
        totalSimulationSteps={totalSimulationSteps}
        canUndoAction={canUndoAction}
        canRedoAction={canRedoAction}
        canIncreaseQubits={canIncreaseQubits}
        canDecreaseQubits={canDecreaseQubits}
        currentQubits={currentQubits}
        qubitMessage={qubitMessage}
        zoomPercentText={zoomPercentText}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        onUndo={onUndo}
        onRedo={onRedo}
        onClearCircuit={onClearCircuit}
        onResetWorkbench={onResetWorkbench}
        onIncreaseQubits={onIncreaseQubits}
        onDecreaseQubits={onDecreaseQubits}
        onLoadBellTemplate={() => onLoadTemplate(BELL_TEMPLATE_ID)}
        onLoadSuperpositionTemplate={() => onLoadTemplate(SUPERPOSITION_TEMPLATE_ID)}
        onZoomOut={onZoomOut}
        onZoomIn={onZoomIn}
        onZoomReset={onZoomReset}
        onSimulationStepChange={onSimulationStepChange}
      />
      <CircuitCanvasViewport
        viewportRef={viewportRef}
        viewportClassName={viewportClassName}
        viewportContentStyle={viewportContentStyle}
        onViewportWheel={onViewportWheel}
        onViewportPointerDown={onViewportPointerDown}
        onViewportPointerMove={onViewportPointerMove}
        onViewportPointerUp={onViewportPointerUp}
        onViewportPointerCancel={onViewportPointerCancel}
        circuit={circuit}
        qubits={qubits}
        layerIndexes={layerIndexes}
        layerCellWidths={layerCellWidths}
        selectedOperationId={selectedOperationId}
        futureOperationIds={futureOperationIds}
        activeParameterValues={activeParameterValues}
        parameterFeedback={parameterFeedback}
        getCellClassName={getCellClassName}
        onDropCell={onDropCell}
        onDragEnterCell={onDragEnterCell}
        onDragOverCell={onDragOverCell}
        onDragLeaveCell={onDragLeaveCell}
        onCellClick={onCellClick}
        onDelete={onDelete}
        onParamChange={onParamChange}
        onNormalizeParam={onNormalizeParam}
      />
      {selectedOperation ? (
        <section
          data-testid="operation-params-panel"
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 10,
            border: "1px solid var(--border-subtle)",
            background: "var(--surface-panel-muted)",
          }}
        >
          <h4 style={{ margin: "0 0 8px 0" }}>
            {"\u9009\u4e2d\u95e8: "} {selectedOperation.gate.toUpperCase()} (layer{" "}
            {selectedOperation.layer})
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
