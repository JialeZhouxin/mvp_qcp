import { useMemo, useState, type DragEvent } from "react";

import {
  getGateCatalog,
  type GateCatalogItem,
  type GateCategory,
} from "../../features/circuit/gates/gate-catalog";
import type { GateName } from "../../features/circuit/model/types";
import GateMatrixTooltip from "./GateMatrixTooltip";

const CATEGORY_ORDER: readonly GateCategory[] = [
  "single",
  "controlled",
  "measurement",
];

const CATEGORY_LABELS: Readonly<Record<GateCategory, string>> = {
  single: "单比特门",
  controlled: "多比特与受控门",
  measurement: "测量",
};

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
  event.dataTransfer.setData("application/x-qcp-gate", gate);
  event.dataTransfer.effectAllowed = "copy";
}

function GatePalette({ gates, showMatrixTooltip = true }: GatePaletteProps) {
  const gateItems = useMemo(() => buildGateItems(gates), [gates]);
  const grouped = useMemo(() => groupByCategory(gateItems), [gateItems]);
  const [activeGate, setActiveGate] = useState<GateName | null>(null);

  return (
    <section style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>门库</h3>
      {CATEGORY_ORDER.map((category) => {
        const items = grouped[category];
        if (items.length === 0) {
          return null;
        }
        return (
          <div key={category} style={{ marginTop: 10 }}>
            <h4 style={{ margin: "0 0 8px 0", color: "#555" }}>
              {CATEGORY_LABELS[category]}
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {items.map((item) => (
                <div key={item.name} style={{ position: "relative" }}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => onDragStart(event, item.name)}
                    onMouseEnter={() => setActiveGate(item.name)}
                    onMouseLeave={() =>
                      setActiveGate((current) =>
                        current === item.name ? null : current,
                      )
                    }
                    onFocus={() => setActiveGate(item.name)}
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
                  {showMatrixTooltip && activeGate === item.name ? (
                    <GateMatrixTooltip
                      gate={item.name}
                      accentColor={item.colorToken}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default GatePalette;
