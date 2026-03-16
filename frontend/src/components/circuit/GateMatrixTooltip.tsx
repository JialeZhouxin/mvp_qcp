import { getGateMatrixPreview } from "../../features/circuit/gates/gate-matrix-preview";
import type { GateName } from "../../features/circuit/model/types";

interface GateMatrixTooltipProps {
  readonly gate: GateName;
  readonly accentColor: string;
}

function GateMatrixTooltip({ gate, accentColor }: GateMatrixTooltipProps) {
  const preview = getGateMatrixPreview(gate);
  return (
    <div
      role="tooltip"
      data-testid={`gate-matrix-tooltip-${gate}`}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        left: 0,
        zIndex: 20,
        width: 240,
        border: `1px solid ${accentColor}`,
        borderRadius: 8,
        background: "#fff",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
        padding: 10,
      }}
    >
      <strong style={{ display: "block", marginBottom: 6, color: accentColor }}>
        {preview.title}
      </strong>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}>{preview.body}</pre>
    </div>
  );
}

export default GateMatrixTooltip;

