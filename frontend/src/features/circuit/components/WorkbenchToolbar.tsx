import type { CircuitTemplate } from "../model/templates";
import { WORKBENCH_COPY } from "../ui/copy-catalog";

interface WorkbenchToolbarProps {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly currentQubits: number;
  readonly canIncreaseQubits: boolean;
  readonly canDecreaseQubits: boolean;
  readonly qubitMessage: string | null;
  readonly templates: readonly CircuitTemplate[];
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onIncreaseQubits: () => void;
  readonly onDecreaseQubits: () => void;
  readonly onClearCircuit: () => void;
  readonly onResetWorkbench: () => void;
  readonly onLoadTemplate: (templateId: string) => void;
}

function WorkbenchToolbar({
  canUndo,
  canRedo,
  currentQubits,
  canIncreaseQubits,
  canDecreaseQubits,
  qubitMessage,
  templates,
  onUndo,
  onRedo,
  onIncreaseQubits,
  onDecreaseQubits,
  onClearCircuit,
  onResetWorkbench,
  onLoadTemplate,
}: WorkbenchToolbarProps) {
  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={onUndo} disabled={!canUndo}>
          {WORKBENCH_COPY.toolbar.undo}
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo}>
          {WORKBENCH_COPY.toolbar.redo}
        </button>
        <button type="button" onClick={onClearCircuit}>
          {WORKBENCH_COPY.toolbar.clearCircuit}
        </button>
        <button type="button" onClick={onResetWorkbench}>
          {WORKBENCH_COPY.toolbar.resetWorkbench}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
        <strong>Qubits:</strong>
        <button type="button" onClick={onDecreaseQubits} disabled={!canDecreaseQubits}>
          -Qubit
        </button>
        <span data-testid="qubit-count">{currentQubits}</span>
        <button type="button" onClick={onIncreaseQubits} disabled={!canIncreaseQubits}>
          +Qubit
        </button>
      </div>
      {qubitMessage ? (
        <p style={{ margin: "8px 0 0 0", color: "#cf1322" }} data-testid="qubit-message">
          {qubitMessage}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <strong>{WORKBENCH_COPY.toolbar.templateLabel}:</strong>
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onLoadTemplate(template.id)}
            title={template.description}
          >
            {template.name}
          </button>
        ))}
      </div>
    </section>
  );
}

export default WorkbenchToolbar;

