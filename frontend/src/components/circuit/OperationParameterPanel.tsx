import type { Operation } from "../../features/circuit/model/types";
import {
  PARAMETER_LABELS,
  getParameterValues,
  isParameterizedGate,
} from "./canvas-gate-utils";

interface OperationParameterPanelProps {
  readonly operation: Operation;
  readonly onParamChange: (index: number, value: number) => void;
}

function OperationParameterPanel({
  operation,
  onParamChange,
}: OperationParameterPanelProps) {
  if (!isParameterizedGate(operation.gate)) {
    return (
      <p style={{ margin: "8px 0 0 0", color: "#666" }}>
        当前选中门无可编辑参数。
      </p>
    );
  }

  const labels = PARAMETER_LABELS[operation.gate];
  const values = getParameterValues(operation);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {labels.map((label, index) => (
        <label key={`${operation.id}-${label}`} style={{ display: "grid", gap: 4 }}>
          <span>{label}</span>
          <input
            type="number"
            step="0.01"
            aria-label={`param-${label}`}
            value={values[index] ?? 0}
            onChange={(event) => onParamChange(index, event.currentTarget.valueAsNumber)}
          />
        </label>
      ))}
    </div>
  );
}

export default OperationParameterPanel;
