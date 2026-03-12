import type { DragEvent } from "react";
import type { GateName } from "../../features/circuit/model/types";

const DEFAULT_GATES: readonly GateName[] = [
  "x",
  "y",
  "z",
  "h",
  "s",
  "sdg",
  "t",
  "tdg",
  "i",
  "rx",
  "ry",
  "rz",
  "u",
  "cx",
  "cz",
  "swap",
  "m",
];

interface GatePaletteProps {
  readonly gates?: readonly GateName[];
}

function onDragStart(event: DragEvent<HTMLButtonElement>, gate: GateName) {
  event.dataTransfer.setData("application/x-qcp-gate", gate);
  event.dataTransfer.effectAllowed = "copy";
}

function GatePalette({ gates = DEFAULT_GATES }: GatePaletteProps) {
  return (
    <section style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>门库</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {gates.map((gate) => (
          <button
            key={gate}
            type="button"
            draggable
            onDragStart={(event) => onDragStart(event, gate)}
            data-testid={`gate-${gate}`}
            style={{ minWidth: 48, padding: "6px 8px" }}
          >
            {gate.toUpperCase()}
          </button>
        ))}
      </div>
    </section>
  );
}

export default GatePalette;
