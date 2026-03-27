import { useEffect, useRef, useState, type ReactNode } from "react";

import { WORKBENCH_COPY } from "../ui/copy-catalog";

interface CircuitCanvasToolbarProps {
  readonly hasWorkbenchControls: boolean;
  readonly simulationStep: number | null;
  readonly totalSimulationSteps: number | null;
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
  readonly onSimulationStepChange: (step: number) => void;
}

interface ToolbarIconButtonProps {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly children: ReactNode;
  readonly testId?: string;
}

function ToolbarIconButton({
  label,
  onClick,
  disabled = false,
  children,
  testId,
}: ToolbarIconButtonProps) {
  return (
    <button
      type="button"
      className="canvas-toolbar-icon-button"
      aria-label={label}
      title={label}
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="canvas-toolbar-divider" aria-hidden="true" />;
}

function IconBase({ children }: { readonly children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="canvas-toolbar-icon">
      {children}
    </svg>
  );
}

function UndoIcon() {
  return (
    <IconBase>
      <path
        d="M7.5 6L4 9.5L7.5 13"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M4.5 9.5H11C13.7614 9.5 16 11.7386 16 14.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </IconBase>
  );
}

function RedoIcon() {
  return (
    <IconBase>
      <path
        d="M12.5 6L16 9.5L12.5 13"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M15.5 9.5H9C6.23858 9.5 4 11.7386 4 14.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </IconBase>
  );
}

function ClearIcon() {
  return (
    <IconBase>
      <path
        d="M5 6H15"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path
        d="M7 6V4.75C7 4.33579 7.33579 4 7.75 4H12.25C12.6642 4 13 4.33579 13 4.75V6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path
        d="M6.5 6.5L7.1 15.1C7.13748 15.636 7.58332 16.05 8.12061 16.05H11.8794C12.4167 16.05 12.8625 15.636 12.9 15.1L13.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </IconBase>
  );
}

function ResetIcon() {
  return (
    <IconBase>
      <path
        d="M10 4.25V2.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path
        d="M6.05 5.45L4.95 4.35"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path
        d="M13.95 5.45L15.05 4.35"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path
        d="M10 6.25C6.82436 6.25 4.25 8.82436 4.25 12C4.25 15.1756 6.82436 17.75 10 17.75C13.1756 17.75 15.75 15.1756 15.75 12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M10 8.5V12L12.35 14.35"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </IconBase>
  );
}

function MinusIcon() {
  return (
    <IconBase>
      <path
        d="M5.25 10H14.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </IconBase>
  );
}

function PlusIcon() {
  return (
    <IconBase>
      <path
        d="M10 5.25V14.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M5.25 10H14.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </IconBase>
  );
}

function ChevronDownIcon() {
  return (
    <IconBase>
      <path
        d="M6 8L10 12L14 8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </IconBase>
  );
}

function TemplateMenu({
  onLoadBellTemplate,
  onLoadSuperpositionTemplate,
}: {
  readonly onLoadBellTemplate: () => void;
  readonly onLoadSuperpositionTemplate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="canvas-template-menu" data-testid="canvas-workbench-templates" ref={rootRef}>
      <button
        type="button"
        className="canvas-template-menu-trigger"
        data-testid="canvas-template-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{WORKBENCH_COPY.toolbar.templateLabel}</span>
        <ChevronDownIcon />
      </button>
      {isOpen ? (
        <div className="canvas-template-menu-content" role="menu">
          <button
            type="button"
            role="menuitem"
            className="canvas-template-menu-item"
            data-testid="canvas-template-option-bell"
            onClick={() => {
              setIsOpen(false);
              onLoadBellTemplate();
            }}
          >
            {WORKBENCH_COPY.toolbar.bellTemplate}
          </button>
          <button
            type="button"
            role="menuitem"
            className="canvas-template-menu-item"
            data-testid="canvas-template-option-superposition"
            onClick={() => {
              setIsOpen(false);
              onLoadSuperpositionTemplate();
            }}
          >
            {WORKBENCH_COPY.toolbar.superpositionTemplate}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CircuitCanvasToolbar({
  hasWorkbenchControls,
  simulationStep,
  totalSimulationSteps,
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
  onSimulationStepChange,
}: CircuitCanvasToolbarProps) {
  const hasSimulationStepControl =
    simulationStep !== null && totalSimulationSteps !== null;

  return (
    <>
      <div className="canvas-workbench-toolbar" data-testid="canvas-workbench-toolbar">
        <div className="canvas-workbench-topbar" data-testid="canvas-workbench-topbar">
          <div className="canvas-workbench-section canvas-workbench-section--left" data-testid="canvas-workbench-left">
            {hasWorkbenchControls ? (
              <div className="canvas-workbench-toolbar-cluster" data-testid="canvas-workbench-actions">
                <ToolbarIconButton
                  label={WORKBENCH_COPY.toolbar.undo}
                  onClick={onUndo}
                  disabled={!canUndoAction}
                  testId="canvas-undo"
                >
                  <UndoIcon />
                </ToolbarIconButton>
                <ToolbarIconButton
                  label={WORKBENCH_COPY.toolbar.redo}
                  onClick={onRedo}
                  disabled={!canRedoAction}
                  testId="canvas-redo"
                >
                  <RedoIcon />
                </ToolbarIconButton>
                <ToolbarDivider />
                <ToolbarIconButton
                  label={WORKBENCH_COPY.toolbar.clearCircuit}
                  onClick={onClearCircuit}
                  testId="canvas-clear-circuit"
                >
                  <ClearIcon />
                </ToolbarIconButton>
                <ToolbarIconButton
                  label={WORKBENCH_COPY.toolbar.resetWorkbench}
                  onClick={onResetWorkbench}
                  testId="canvas-reset-workbench"
                >
                  <ResetIcon />
                </ToolbarIconButton>
              </div>
            ) : null}
          </div>

          <div
            className="canvas-workbench-section canvas-workbench-section--center"
            data-testid="canvas-workbench-center"
          >
            {hasWorkbenchControls ? (
              <div className="canvas-workbench-toolbar-cluster" data-testid="canvas-workbench-qubits">
                <span className="canvas-workbench-label">Qubits</span>
                <ToolbarIconButton
                  label="减少量子比特"
                  onClick={onDecreaseQubits}
                  disabled={!canDecreaseQubits}
                  testId="canvas-decrease-qubits"
                >
                  <MinusIcon />
                </ToolbarIconButton>
                <span className="canvas-workbench-value" data-testid="canvas-qubit-count">
                  {currentQubits}
                </span>
                <ToolbarIconButton
                  label="增加量子比特"
                  onClick={onIncreaseQubits}
                  disabled={!canIncreaseQubits}
                  testId="canvas-increase-qubits"
                >
                  <PlusIcon />
                </ToolbarIconButton>
              </div>
            ) : null}
          </div>

          <div
            className="canvas-workbench-section canvas-workbench-section--right"
            data-testid="canvas-workbench-right"
          >
            {hasWorkbenchControls ? (
              <TemplateMenu
                onLoadBellTemplate={onLoadBellTemplate}
                onLoadSuperpositionTemplate={onLoadSuperpositionTemplate}
              />
            ) : null}
            <div className="canvas-workbench-toolbar-cluster" data-testid="canvas-zoom-toolbar">
              <span className="canvas-zoom-percent" data-testid="canvas-zoom-percent">
                {zoomPercentText}
              </span>
              <ToolbarIconButton
                label={WORKBENCH_COPY.toolbar.zoomOutAriaLabel}
                onClick={onZoomOut}
                disabled={!canZoomOut}
                testId="canvas-zoom-out"
              >
                <MinusIcon />
              </ToolbarIconButton>
              <ToolbarIconButton
                label={WORKBENCH_COPY.toolbar.zoomInAriaLabel}
                onClick={onZoomIn}
                disabled={!canZoomIn}
                testId="canvas-zoom-in"
              >
                <PlusIcon />
              </ToolbarIconButton>
              <ToolbarIconButton
                label={WORKBENCH_COPY.toolbar.zoomResetAriaLabel}
                onClick={onZoomReset}
                testId="canvas-zoom-reset"
              >
                <span className="canvas-toolbar-reset-text">100</span>
              </ToolbarIconButton>
            </div>
          </div>
        </div>

        {hasSimulationStepControl ? (
          <div className="canvas-workbench-timeline" data-testid="canvas-workbench-timeline">
            <div className="canvas-workbench-timeline-meta">
              <label className="canvas-workbench-label" htmlFor="canvas-time-step-slider">
                时间步
              </label>
              <span className="canvas-workbench-value" data-testid="canvas-time-step-value">
                {simulationStep} / {totalSimulationSteps}
              </span>
            </div>
            <input
              id="canvas-time-step-slider"
              className="canvas-workbench-timeline-slider"
              data-testid="canvas-time-step-slider"
              type="range"
              min={0}
              max={totalSimulationSteps}
              value={simulationStep}
              disabled={totalSimulationSteps === 0}
              onChange={(event) => onSimulationStepChange(Number(event.target.value))}
            />
          </div>
        ) : null}
      </div>
      {hasWorkbenchControls && qubitMessage ? (
        <p className="canvas-workbench-message" data-testid="qubit-message">
          {qubitMessage}
        </p>
      ) : null}
    </>
  );
}

export default CircuitCanvasToolbar;
