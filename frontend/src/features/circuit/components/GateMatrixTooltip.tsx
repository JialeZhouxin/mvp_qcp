import { getGateMatrixPreview } from "../gates/gate-matrix-preview";
import type { GateName } from "../model/types";

interface GateMatrixTooltipProps {
  readonly gate: GateName;
  readonly accentColor: string;
}

const GATE_DESCRIPTIONS: Readonly<Record<GateName, string>> = Object.freeze({
  i: "Identity gate.",
  x: "Pauli-X gate (bit flip).",
  y: "Pauli-Y gate.",
  z: "Pauli-Z gate (phase flip).",
  h: "Hadamard gate, creates superposition.",
  s: "S phase gate.",
  sdg: "Inverse S phase gate.",
  t: "T phase gate.",
  tdg: "Inverse T phase gate.",
  rx: "Rotation around X-axis.",
  ry: "Rotation around Y-axis.",
  rz: "Rotation around Z-axis.",
  u: "General single-qubit U gate.",
  p: "Phase gate.",
  cx: "Controlled-X (CNOT) gate.",
  cp: "Controlled phase gate.",
  cz: "Controlled-Z gate.",
  ccx: "Toffoli (CCX) gate.",
  swap: "Swap gate.",
  m: "Measurement gate.",
});

function GateMatrixTooltip({ gate, accentColor }: GateMatrixTooltipProps) {
  const preview = getGateMatrixPreview(gate);
  const description = GATE_DESCRIPTIONS[gate];

  return (
    <div
      role="tooltip"
      data-testid={`gate-matrix-tooltip-${gate}`}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        left: 0,
        zIndex: 20,
        width: 300,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#fff",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.16)",
        padding: 12,
      }}
    >
      <strong
        style={{
          display: "block",
          marginBottom: 10,
          color: accentColor,
          fontSize: 14,
        }}
      >
        {preview.title}
      </strong>

      <div style={{ marginBottom: 10 }}>
        <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#334155" }}>
          Matrix:
        </div>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            fontSize: 12,
            lineHeight: 1.4,
            color: "#0f172a",
          }}
        >
          {preview.body}
        </pre>
      </div>

      <div>
        <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#334155" }}>
          Description:
        </div>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "#334155" }}>
          {description}
        </p>
      </div>
    </div>
  );
}

export default GateMatrixTooltip;
