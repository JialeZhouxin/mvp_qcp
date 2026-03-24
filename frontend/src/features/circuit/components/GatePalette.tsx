import { useMemo, useState, type DragEvent } from "react";

import {
  getGateCatalog,
  type GateCatalogItem,
  type GateCategory,
} from "../gates/gate-catalog";
import type { GateName } from "../model/types";
import GateMatrixTooltip from "./GateMatrixTooltip";

const CATEGORY_ORDER: readonly GateCategory[] = [
  "single",
  "controlled",
  "measurement",
];

function buildGateItems(gates?: readonly GateName[]): readonly GateCatalogItem[] {
  const catalog = getGateCatalog();
  if (!gates) {
    return catalog;
  }
  const allow = new Set(gates);
  return catalog.filter((item) => allow.has(item.name));
}

function groupByCategory(
  items: readonly GateCatalogItem[],
): Readonly<Record<GateCategory, readonly GateCatalogItem[]>> {
  const grouped: Record<GateCategory, GateCatalogItem[]> = {
    single: [],
    controlled: [],
    measurement: [],
  };
  for (const item of items) {
    grouped[item.category].push(item);
  }
  return grouped;
}

interface GatePaletteProps {
  readonly gates?: readonly GateName[];
  readonly showMatrixTooltip?: boolean;
}

function onDragStart(event: DragEvent<HTMLButtonElement>, gate: GateName) {
  if (!event.dataTransfer) {
    return;
  }
  event.dataTransfer.setData("application/x-qcp-gate", gate);
  event.dataTransfer.effectAllowed = "copy";
}

function GatePalette({ gates, showMatrixTooltip = true }: GatePaletteProps) {
  const gateItems = useMemo(() => buildGateItems(gates), [gates]);
  const grouped = useMemo(() => groupByCategory(gateItems), [gateItems]);
  const orderedItems = useMemo(
    () => CATEGORY_ORDER.flatMap((category) => grouped[category]),
    [grouped],
  );
  const [activeGate, setActiveGate] = useState<GateName | null>(null);
  const [isDraggingGate, setIsDraggingGate] = useState(false);

  return (
    <section
      data-testid="gate-palette-panel"
      style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}
      onDropCapture={() => setIsDraggingGate(false)}
    >
      <h3 style={{ marginTop: 0 }}>门库</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {orderedItems.map((item) => (
          <div key={item.name} style={{ position: "relative" }}>
            <button
              type="button"
              draggable
              onDragStart={(event) => {
                setActiveGate(null);
                setIsDraggingGate(true);
                onDragStart(event, item.name);
              }}
              onDragEnd={() => setIsDraggingGate(false)}
              onMouseEnter={() => {
                if (!isDraggingGate) {
                  setActiveGate(item.name);
                }
              }}
              onMouseLeave={() =>
                setActiveGate((current) =>
                  current === item.name ? null : current,
                )
              }
              onFocus={() => {
                if (!isDraggingGate) {
                  setActiveGate(item.name);
                }
              }}
              onBlur={() =>
                setActiveGate((current) =>
                  current === item.name ? null : current,
                )
              }
              data-testid={`gate-${item.name}`}
              style={{
                minWidth: 56,
                padding: "6px 8px",
                borderRadius: 6,
                border: `1px solid ${item.colorToken}`,
                color: item.colorToken,
                background: "#fff",
                fontWeight: 600,
              }}
            >
              {item.label}
            </button>
            {showMatrixTooltip && !isDraggingGate && activeGate === item.name ? (
              <GateMatrixTooltip
                gate={item.name}
                accentColor={item.colorToken}
              />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export default GatePalette;


