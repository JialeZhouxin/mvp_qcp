import type { CircuitTemplate } from "../../features/circuit/model/templates";

interface WorkbenchToolbarProps {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly templates: readonly CircuitTemplate[];
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onClearCircuit: () => void;
  readonly onResetWorkbench: () => void;
  readonly onLoadTemplate: (templateId: string) => void;
}

function WorkbenchToolbar({
  canUndo,
  canRedo,
  templates,
  onUndo,
  onRedo,
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
          清空线路
        </button>
        <button type="button" onClick={onResetWorkbench}>
          重置工作台
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <strong>示例模板:</strong>
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
