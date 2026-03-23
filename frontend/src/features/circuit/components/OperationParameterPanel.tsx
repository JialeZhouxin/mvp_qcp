import type { Operation } from "../model/types";
import {
  PARAMETER_LABELS,
  getParameterValues,
  isParameterizedGate,
} from "./canvas-gate-utils";
import type { ParameterValidationResult } from "./parameter-validation";

interface OperationParameterPanelProps {
  readonly operation: Operation;
  readonly values?: readonly number[];
  readonly feedback?: Readonly<Record<number, ParameterValidationResult>>;
  readonly onParamChange: (index: number, value: number) => void;
  readonly onNormalizeParam?: (index: number) => void;
  readonly compact?: boolean;
  readonly testId?: string;
}

function OperationParameterPanel({
  operation,
  values,
  feedback,
  onParamChange,
  onNormalizeParam,
  compact = false,
  testId,
}: OperationParameterPanelProps) {
  if (!isParameterizedGate(operation.gate)) {
    return <p style={{ margin: "8px 0 0 0", color: "#666" }}>Current gate has no editable parameters.</p>;
  }

  const labels = PARAMETER_LABELS[operation.gate];
  const parameterValues = values ?? getParameterValues(operation);
  const parameterFeedback = feedback ?? {};

  return (
    <div
      data-testid={testId}
      style={{
        display: "grid",
        gap: compact ? 6 : 8,
      }}
    >
      {labels.map((label, index) => {
        const fieldFeedback = parameterFeedback[index];
        const isWarning = fieldFeedback?.level === "warning";
        const isError = fieldFeedback?.level === "error";

        return (
          <div key={`${operation.id}-${label}`} style={{ display: "grid", gap: 4 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span>{label}</span>
              <input
                type="number"
                step="0.01"
                aria-label={`param-${label}`}
                value={parameterValues[index] ?? 0}
                onChange={(event) => onParamChange(index, event.currentTarget.valueAsNumber)}
                style={{
                  border: isError
                    ? "1px solid #cf1322"
                    : isWarning
                      ? "1px solid #d48806"
                      : undefined,
                  borderRadius: 4,
                  padding: "2px 6px",
                }}
              />
            </label>
            {isWarning && fieldFeedback?.message ? (
              <div style={{ display: "grid", gap: 4 }}>
                <small data-testid={`param-warning-${index}`} style={{ color: "#ad6800" }}>
                  {fieldFeedback.message}
                </small>
                {onNormalizeParam && fieldFeedback.normalizedValue !== null ? (
                  <button
                    type="button"
                    data-testid={`param-normalize-${index}`}
                    onClick={() => onNormalizeParam(index)}
                    style={{ justifySelf: "start" }}
                  >
                    Normalize to suggested range
                  </button>
                ) : null}
              </div>
            ) : null}
            {isError && fieldFeedback?.message ? (
              <small data-testid={`param-error-${index}`} style={{ color: "#cf1322" }}>
                {fieldFeedback.message}
              </small>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default OperationParameterPanel;


