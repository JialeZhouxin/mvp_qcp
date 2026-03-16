import type { CircuitTemplate } from "../../features/circuit/model/templates";

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
          撤销
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo}>
          重做
        </button>
        <button type="button" onClick={onClearCircuit}>
          清空电路
        </button>
        <button type="button" onClick={onResetWorkbench}>
          重置工作台
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
        <strong>模板:</strong>
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
