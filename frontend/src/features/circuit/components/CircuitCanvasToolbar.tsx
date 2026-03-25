import { useEffect, useState, type ChangeEvent } from "react";

import { WORKBENCH_COPY } from "../ui/copy-catalog";

interface CircuitCanvasToolbarProps {
  readonly hasWorkbenchControls: boolean;
  readonly canUndoAction: boolean;
  readonly canRedoAction: boolean;
  readonly canIncreaseQubits: boolean;
  readonly canDecreaseQubits: boolean;
  readonly currentQubits: number;
  readonly qubitMessage: string | null;
  readonly executionGateCount: number;
  readonly executionGateCountMax: number;
  readonly zoomPercentText: string;
  readonly canZoomIn: boolean;
  readonly canZoomOut: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onClearCircuit: () => void;
  readonly onResetWorkbench: () => void;
  readonly onIncreaseQubits: () => void;
  readonly onDecreaseQubits: () => void;
  readonly onLoadBellTemplate: () => void;
  readonly onLoadSuperpositionTemplate: () => void;
  readonly onExecutionGateCountCommit: (gateCount: number) => void;
  readonly onZoomOut: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomReset: () => void;
}

const EXECUTION_GATE_COUNT_SLIDER_ID = "canvas-execution-gate-count-slider";

function normalizeExecutionGateCount(value: number, max: number): number {
  const normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
  return Math.min(Math.max(normalized, 0), max);
}

function CircuitCanvasToolbar({
  hasWorkbenchControls,
  canUndoAction,
  canRedoAction,
  canIncreaseQubits,
  canDecreaseQubits,
  currentQubits,
  qubitMessage,
  executionGateCount,
  executionGateCountMax,
  zoomPercentText,
  canZoomIn,
  canZoomOut,
  onUndo,
  onRedo,
  onClearCircuit,
  onResetWorkbench,
  onIncreaseQubits,
  onDecreaseQubits,
  onLoadBellTemplate,
  onLoadSuperpositionTemplate,
  onExecutionGateCountCommit,
  onZoomOut,
  onZoomIn,
  onZoomReset,
}: CircuitCanvasToolbarProps) {
  const normalizedExecutionGateCountMax = Math.max(0, Math.trunc(executionGateCountMax));
  const committedExecutionGateCount = normalizeExecutionGateCount(
    executionGateCount,
    normalizedExecutionGateCountMax,
  );
  const [draftExecutionGateCount, setDraftExecutionGateCount] = useState(committedExecutionGateCount);

  useEffect(() => {
    setDraftExecutionGateCount(committedExecutionGateCount);
  }, [committedExecutionGateCount]);

  const onExecutionGateCountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeExecutionGateCount(
      Number(event.target.value),
      normalizedExecutionGateCountMax,
    );
    setDraftExecutionGateCount(normalized);
    if (normalized !== committedExecutionGateCount) {
      onExecutionGateCountCommit(normalized);
    }
  };

  return (
    <>
      <div className="canvas-workbench-toolbar" data-testid="canvas-workbench-toolbar">
        <div className="canvas-workbench-row" data-testid="canvas-workbench-row-1">
          {hasWorkbenchControls ? (
            <div className="canvas-workbench-group" data-testid="canvas-workbench-actions">
              <button type="button" className="canvas-workbench-btn" onClick={onUndo} disabled={!canUndoAction}>
                {WORKBENCH_COPY.toolbar.undo}
              </button>
              <button type="button" className="canvas-workbench-btn" onClick={onRedo} disabled={!canRedoAction}>
                {WORKBENCH_COPY.toolbar.redo}
              </button>
              <button type="button" className="canvas-workbench-btn" onClick={onClearCircuit}>
                {WORKBENCH_COPY.toolbar.clearCircuit}
              </button>
              <button type="button" className="canvas-workbench-btn" onClick={onResetWorkbench}>
                {WORKBENCH_COPY.toolbar.resetWorkbench}
              </button>
            </div>
          ) : null}
          {hasWorkbenchControls ? (
            <div className="canvas-workbench-group" data-testid="canvas-workbench-execution-gates">
              <label htmlFor={EXECUTION_GATE_COUNT_SLIDER_ID} className="canvas-workbench-label">
                {WORKBENCH_COPY.toolbar.executionGateCountLabel}
              </label>
              <input
                id={EXECUTION_GATE_COUNT_SLIDER_ID}
                type="range"
                min={0}
                max={normalizedExecutionGateCountMax}
                step={1}
                value={draftExecutionGateCount}
                onChange={onExecutionGateCountChange}
                aria-label={WORKBENCH_COPY.toolbar.executionGateCountAriaLabel}
                data-testid="canvas-execution-gate-count-slider"
                disabled={normalizedExecutionGateCountMax === 0}
              />
              <span
                className="canvas-workbench-value"
                data-testid="canvas-execution-gate-count-value"
              >
                {committedExecutionGateCount}/{normalizedExecutionGateCountMax}
              </span>
            </div>
          ) : null}
        </div>
        <div className="canvas-workbench-row" data-testid="canvas-workbench-row-2">
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
              <span className="canvas-workbench-label">{WORKBENCH_COPY.toolbar.templateLabel}</span>
              <button type="button" className="canvas-workbench-btn" onClick={onLoadBellTemplate}>
                {WORKBENCH_COPY.toolbar.bellTemplate}
              </button>
              <button type="button" className="canvas-workbench-btn" onClick={onLoadSuperpositionTemplate}>
                {WORKBENCH_COPY.toolbar.superpositionTemplate}
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
              aria-label={WORKBENCH_COPY.toolbar.zoomOutAriaLabel}
            >
              -
            </button>
            <button
              type="button"
              className="canvas-workbench-btn canvas-workbench-btn--small"
              data-testid="canvas-zoom-in"
              onClick={onZoomIn}
              disabled={!canZoomIn}
              aria-label={WORKBENCH_COPY.toolbar.zoomInAriaLabel}
            >
              +
            </button>
            <button
              type="button"
              className="canvas-workbench-btn canvas-workbench-btn--small"
              data-testid="canvas-zoom-reset"
              onClick={onZoomReset}
              aria-label={WORKBENCH_COPY.toolbar.zoomResetAriaLabel}
            >
              100%
            </button>
          </div>
        </div>
      </div>
      {hasWorkbenchControls && qubitMessage ? (
        <p style={{ margin: "0 0 8px 0", color: "#cf1322" }} data-testid="qubit-message">
          {qubitMessage}
        </p>
      ) : null}
    </>
  );
}

export default CircuitCanvasToolbar;
