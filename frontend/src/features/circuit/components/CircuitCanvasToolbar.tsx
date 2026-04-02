import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { WORKBENCH_COPY } from "../ui/copy-catalog";
import { WorkbenchControlButton, WorkbenchDivider } from "./WorkbenchControls";
import "./WorkbenchControls.css";

interface CircuitCanvasToolbarProps {
  readonly hasWorkbenchControls: boolean;
  readonly simulationStep: number | null;
  readonly totalSimulationSteps: number | null;
  readonly canUndoAction: boolean;
  readonly canRedoAction: boolean;
  readonly canIncreaseQubits: boolean;
  readonly canDecreaseQubits: boolean;
  readonly currentQubits: number;
  readonly maxBeforeColumn: number;
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
  readonly onInsertColumns: (beforeColumnOneBased: number, count: number) => void;
  readonly onDeleteEmptyColumns: (beforeColumnOneBased: number, count: number) => void;
  readonly onLoadBellTemplate: () => void;
  readonly onLoadSuperpositionTemplate: () => void;
  readonly onLoadQftTemplate: (numQubits: number) => void;
  readonly onLoadGroverTemplate: () => void;
  readonly onZoomOut: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomReset: () => void;
  readonly onSimulationStepChange: (step: number) => void;
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
  onLoadQftTemplate,
  onLoadGroverTemplate,
}: {
  readonly onLoadBellTemplate: () => void;
  readonly onLoadSuperpositionTemplate: () => void;
  readonly onLoadQftTemplate: (numQubits: number) => void;
  readonly onLoadGroverTemplate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isQftDialogOpen, setIsQftDialogOpen] = useState(false);
  const [qftInput, setQftInput] = useState(WORKBENCH_COPY.toolbar.qftPromptDefaultValue);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setIsQftDialogOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsQftDialogOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const openQftDialog = () => {
    setQftInput(WORKBENCH_COPY.toolbar.qftPromptDefaultValue);
    setIsQftDialogOpen(true);
  };

  const handleQftSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsQftDialogOpen(false);
    onLoadQftTemplate(Number(qftInput));
  };

  return (
    <div className="canvas-template-menu" data-testid="canvas-workbench-templates" ref={rootRef}>
      <WorkbenchControlButton
        variant="ghost"
        className="canvas-template-menu-trigger"
        data-testid="canvas-template-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{WORKBENCH_COPY.toolbar.templateLabel}</span>
        <ChevronDownIcon />
      </WorkbenchControlButton>
      {isOpen ? (
        <div className="canvas-template-menu-content" role="menu">
          <WorkbenchControlButton
            variant="ghost"
            role="menuitem"
            className="canvas-template-menu-item"
            data-testid="canvas-template-option-bell"
            onClick={() => {
              setIsOpen(false);
              onLoadBellTemplate();
            }}
          >
            {WORKBENCH_COPY.toolbar.bellTemplate}
          </WorkbenchControlButton>
          <WorkbenchControlButton
            variant="ghost"
            role="menuitem"
            className="canvas-template-menu-item"
            data-testid="canvas-template-option-superposition"
            onClick={() => {
              setIsOpen(false);
              onLoadSuperpositionTemplate();
            }}
          >
            {WORKBENCH_COPY.toolbar.superpositionTemplate}
          </WorkbenchControlButton>
          <WorkbenchControlButton
            variant="ghost"
            role="menuitem"
            className="canvas-template-menu-item"
            data-testid="canvas-template-option-qft"
            onClick={() => {
              setIsOpen(false);
              openQftDialog();
            }}
          >
            {WORKBENCH_COPY.toolbar.qftTemplate}
          </WorkbenchControlButton>
          <WorkbenchControlButton
            variant="ghost"
            role="menuitem"
            className="canvas-template-menu-item"
            data-testid="canvas-template-option-grover"
            onClick={() => {
              setIsOpen(false);
              onLoadGroverTemplate();
            }}
          >
            {WORKBENCH_COPY.toolbar.groverTemplate}
          </WorkbenchControlButton>
        </div>
      ) : null}
      {isQftDialogOpen ? (
        <form
          className="canvas-template-qft-dialog"
          data-testid="canvas-qft-dialog"
          onSubmit={handleQftSubmit}
        >
          <label className="canvas-template-qft-label" htmlFor="canvas-qft-input">
            {WORKBENCH_COPY.toolbar.qftPrompt}
          </label>
          <input
            id="canvas-qft-input"
            data-testid="canvas-qft-input"
            className="canvas-template-qft-input"
            type="number"
            min={2}
            max={32}
            step={1}
            value={qftInput}
            onChange={(event) => setQftInput(event.target.value)}
          />
          <div className="canvas-template-qft-actions">
            <WorkbenchControlButton
              type="button"
              variant="ghost"
              className="canvas-template-qft-action"
              data-testid="canvas-qft-cancel"
              onClick={() => setIsQftDialogOpen(false)}
            >
              {WORKBENCH_COPY.toolbar.qftCancel}
            </WorkbenchControlButton>
            <WorkbenchControlButton
              type="submit"
              variant="surface"
              className="canvas-template-qft-action"
              data-testid="canvas-qft-confirm"
            >
              {WORKBENCH_COPY.toolbar.qftConfirm}
            </WorkbenchControlButton>
          </div>
        </form>
      ) : null}
    </div>
  );
}

const DEFAULT_COLUMN_INPUT = "1";

function parseColumnInput(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.trunc(parsed);
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
  maxBeforeColumn,
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
  onInsertColumns,
  onDeleteEmptyColumns,
  onLoadBellTemplate,
  onLoadSuperpositionTemplate,
  onLoadQftTemplate,
  onLoadGroverTemplate,
  onZoomOut,
  onZoomIn,
  onZoomReset,
  onSimulationStepChange,
}: CircuitCanvasToolbarProps) {
  const hasSimulationStepControl =
    simulationStep !== null && totalSimulationSteps !== null;
  const [columnBeforeInput, setColumnBeforeInput] = useState(DEFAULT_COLUMN_INPUT);
  const [columnCountInput, setColumnCountInput] = useState(DEFAULT_COLUMN_INPUT);

  useEffect(() => {
    const resolved = parseColumnInput(columnBeforeInput, 1);
    const clamped = Math.min(Math.max(resolved, 1), Math.max(1, maxBeforeColumn));
    if (String(clamped) !== columnBeforeInput) {
      setColumnBeforeInput(String(clamped));
    }
  }, [columnBeforeInput, maxBeforeColumn]);

  const normalizeBeforeInput = () => {
    const resolved = parseColumnInput(columnBeforeInput, 1);
    const clamped = Math.min(Math.max(resolved, 1), Math.max(1, maxBeforeColumn));
    setColumnBeforeInput(String(clamped));
  };

  const normalizeCountInput = () => {
    const resolved = parseColumnInput(columnCountInput, 1);
    setColumnCountInput(String(Math.max(1, resolved)));
  };

  const handleInsertColumns = () => {
    onInsertColumns(
      parseColumnInput(columnBeforeInput, 1),
      parseColumnInput(columnCountInput, 1),
    );
  };

  const handleDeleteEmptyColumns = () => {
    onDeleteEmptyColumns(
      parseColumnInput(columnBeforeInput, 1),
      parseColumnInput(columnCountInput, 1),
    );
  };

  return (
    <>
      <div className="canvas-workbench-toolbar" data-testid="canvas-workbench-toolbar">
        <div className="canvas-workbench-topbar" data-testid="canvas-workbench-topbar">
          <div className="canvas-workbench-section canvas-workbench-section--left" data-testid="canvas-workbench-left">
            {hasWorkbenchControls ? (
              <div className="canvas-workbench-toolbar-cluster" data-testid="canvas-workbench-actions">
                <WorkbenchControlButton
                  variant="icon"
                  aria-label={WORKBENCH_COPY.toolbar.undo}
                  title={WORKBENCH_COPY.toolbar.undo}
                  onClick={onUndo}
                  disabled={!canUndoAction}
                  data-testid="canvas-undo"
                >
                  <UndoIcon />
                </WorkbenchControlButton>
                <WorkbenchControlButton
                  variant="icon"
                  aria-label={WORKBENCH_COPY.toolbar.redo}
                  title={WORKBENCH_COPY.toolbar.redo}
                  onClick={onRedo}
                  disabled={!canRedoAction}
                  data-testid="canvas-redo"
                >
                  <RedoIcon />
                </WorkbenchControlButton>
                <WorkbenchDivider />
                <WorkbenchControlButton
                  variant="icon"
                  aria-label={WORKBENCH_COPY.toolbar.clearCircuit}
                  title={WORKBENCH_COPY.toolbar.clearCircuit}
                  onClick={onClearCircuit}
                  data-testid="canvas-clear-circuit"
                >
                  <ClearIcon />
                </WorkbenchControlButton>
                <WorkbenchControlButton
                  variant="icon"
                  aria-label={WORKBENCH_COPY.toolbar.resetWorkbench}
                  title={WORKBENCH_COPY.toolbar.resetWorkbench}
                  onClick={onResetWorkbench}
                  data-testid="canvas-reset-workbench"
                >
                  <ResetIcon />
                </WorkbenchControlButton>
              </div>
            ) : null}
          </div>

          <div
            className="canvas-workbench-section canvas-workbench-section--center"
            data-testid="canvas-workbench-center"
          >
            <div
              className="canvas-workbench-center-controls"
              data-testid="canvas-workbench-center-controls"
            >
              {hasWorkbenchControls ? (
                <div className="canvas-workbench-toolbar-cluster" data-testid="canvas-workbench-qubits">
                  <span className="canvas-workbench-label">Qubits</span>
                  <WorkbenchControlButton
                    variant="icon"
                    aria-label="减少 qubits"
                    title="减少 qubits"
                    onClick={onDecreaseQubits}
                    disabled={!canDecreaseQubits}
                    data-testid="canvas-decrease-qubits"
                  >
                    <MinusIcon />
                  </WorkbenchControlButton>
                  <span className="canvas-workbench-value" data-testid="canvas-qubit-count">
                    {currentQubits}
                  </span>
                  <WorkbenchControlButton
                    variant="icon"
                    aria-label="增加 qubits"
                    title="增加 qubits"
                    onClick={onIncreaseQubits}
                    disabled={!canIncreaseQubits}
                    data-testid="canvas-increase-qubits"
                  >
                    <PlusIcon />
                  </WorkbenchControlButton>
                </div>
              ) : null}
              {hasWorkbenchControls ? <WorkbenchDivider /> : null}
              <div className="canvas-workbench-toolbar-cluster" data-testid="canvas-workbench-columns">
                <span className="canvas-workbench-label">Columns</span>
                <label className="canvas-workbench-column-field" htmlFor="canvas-column-before-input">
                  <span className="canvas-workbench-column-text">Before</span>
                  <input
                    id="canvas-column-before-input"
                    data-testid="canvas-column-before-input"
                    className="canvas-workbench-column-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={maxBeforeColumn}
                    step={1}
                    value={columnBeforeInput}
                    onBlur={normalizeBeforeInput}
                    onChange={(event) => setColumnBeforeInput(event.target.value)}
                  />
                </label>
                <label className="canvas-workbench-column-field" htmlFor="canvas-column-count-input">
                  <span className="canvas-workbench-column-text">Count</span>
                  <input
                    id="canvas-column-count-input"
                    data-testid="canvas-column-count-input"
                    className="canvas-workbench-column-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={columnCountInput}
                    onBlur={normalizeCountInput}
                    onChange={(event) => setColumnCountInput(event.target.value)}
                  />
                </label>
                <WorkbenchControlButton
                  variant="icon"
                  aria-label="删除空列"
                  title="删除空列"
                  data-testid="canvas-delete-empty-columns"
                  onClick={handleDeleteEmptyColumns}
                >
                  <MinusIcon />
                </WorkbenchControlButton>
                <WorkbenchControlButton
                  variant="icon"
                  aria-label="插入列"
                  title="插入列"
                  data-testid="canvas-insert-columns"
                  onClick={handleInsertColumns}
                >
                  <PlusIcon />
                </WorkbenchControlButton>
              </div>
            </div>
          </div>

          <div
            className="canvas-workbench-section canvas-workbench-section--right"
            data-testid="canvas-workbench-right"
          >
            {hasWorkbenchControls ? (
              <TemplateMenu
                onLoadBellTemplate={onLoadBellTemplate}
                onLoadSuperpositionTemplate={onLoadSuperpositionTemplate}
                onLoadQftTemplate={onLoadQftTemplate}
                onLoadGroverTemplate={onLoadGroverTemplate}
              />
            ) : null}
            <div className="canvas-workbench-toolbar-cluster" data-testid="canvas-zoom-toolbar">
              <span className="canvas-zoom-percent" data-testid="canvas-zoom-percent">
                {zoomPercentText}
              </span>
              <WorkbenchControlButton
                variant="icon"
                aria-label={WORKBENCH_COPY.toolbar.zoomOutAriaLabel}
                title={WORKBENCH_COPY.toolbar.zoomOutAriaLabel}
                onClick={onZoomOut}
                disabled={!canZoomOut}
                data-testid="canvas-zoom-out"
              >
                <MinusIcon />
              </WorkbenchControlButton>
              <WorkbenchControlButton
                variant="icon"
                aria-label={WORKBENCH_COPY.toolbar.zoomInAriaLabel}
                title={WORKBENCH_COPY.toolbar.zoomInAriaLabel}
                onClick={onZoomIn}
                disabled={!canZoomIn}
                data-testid="canvas-zoom-in"
              >
                <PlusIcon />
              </WorkbenchControlButton>
              <WorkbenchControlButton
                variant="icon"
                aria-label={WORKBENCH_COPY.toolbar.zoomResetAriaLabel}
                title={WORKBENCH_COPY.toolbar.zoomResetAriaLabel}
                onClick={onZoomReset}
                data-testid="canvas-zoom-reset"
              >
                <span className="canvas-toolbar-reset-text">100</span>
              </WorkbenchControlButton>
            </div>
          </div>
        </div>

        {hasSimulationStepControl ? (
          <div className="canvas-workbench-timeline" data-testid="canvas-workbench-timeline">
            <div className="canvas-workbench-timeline-meta">
              <label className="canvas-workbench-label" htmlFor="canvas-time-step-slider">
                鏃堕棿姝?              </label>
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
