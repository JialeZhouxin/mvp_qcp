interface CircuitCanvasToolbarProps {
  readonly hasWorkbenchControls: boolean;
  readonly canUndoAction: boolean;
  readonly canRedoAction: boolean;
  readonly canIncreaseQubits: boolean;
  readonly canDecreaseQubits: boolean;
  readonly currentQubits: number;
  readonly qubitMessage: string | null;
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
  readonly onZoomOut: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomReset: () => void;
}

function CircuitCanvasToolbar({
  hasWorkbenchControls,
  canUndoAction,
  canRedoAction,
  canIncreaseQubits,
  canDecreaseQubits,
  currentQubits,
  qubitMessage,
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
  onZoomOut,
  onZoomIn,
  onZoomReset,
}: CircuitCanvasToolbarProps) {
  return (
    <>
      <div className="canvas-workbench-toolbar" data-testid="canvas-workbench-toolbar">
        {hasWorkbenchControls ? (
          <div className="canvas-workbench-group" data-testid="canvas-workbench-actions">
            <button type="button" className="canvas-workbench-btn" onClick={onUndo} disabled={!canUndoAction}>
              鎾ら攢
            </button>
            <button type="button" className="canvas-workbench-btn" onClick={onRedo} disabled={!canRedoAction}>
              閲嶅仛
            </button>
            <button type="button" className="canvas-workbench-btn" onClick={onClearCircuit}>
              娓呯┖鐢佃矾
            </button>
            <button type="button" className="canvas-workbench-btn" onClick={onResetWorkbench}>
              閲嶇疆宸ヤ綔鍙?            </button>
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
            <span className="canvas-workbench-label">妯℃澘</span>
            <button type="button" className="canvas-workbench-btn" onClick={onLoadBellTemplate}>
              Bell 鎬?            </button>
            <button type="button" className="canvas-workbench-btn" onClick={onLoadSuperpositionTemplate}>
              鍧囧寑鍙犲姞鎬?            </button>
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
            aria-label="缂╁皬鐢诲竷"
          >
            -
          </button>
          <button
            type="button"
            className="canvas-workbench-btn canvas-workbench-btn--small"
            data-testid="canvas-zoom-in"
            onClick={onZoomIn}
            disabled={!canZoomIn}
            aria-label="鏀惧ぇ鐢诲竷"
          >
            +
          </button>
          <button
            type="button"
            className="canvas-workbench-btn canvas-workbench-btn--small"
            data-testid="canvas-zoom-reset"
            onClick={onZoomReset}
            aria-label="閲嶇疆鐢诲竷缂╂斁"
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
    </>
  );
}

export default CircuitCanvasToolbar;

