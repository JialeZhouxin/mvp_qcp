import { useEffect, useMemo, useState, type DragEvent } from "react";

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

function GatePalette({ gates, showMatrixTooltip = true }: GatePaletteProps) {
  const gateItems = useMemo(() => buildGateItems(gates), [gates]);
  const grouped = useMemo(() => groupByCategory(gateItems), [gateItems]);
  const orderedItems = useMemo(
    () => CATEGORY_ORDER.flatMap((category) => grouped[category]),
    [grouped],
  );
  const [hoveredGate, setHoveredGate] = useState<GateName | null>(null);
  const [focusedGate, setFocusedGate] = useState<GateName | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [suppressedGate, setSuppressedGate] = useState<GateName | null>(null);

  useEffect(() => {
    const handleDragFinished = () => {
      setIsDragging(false);
    };

    window.addEventListener("dragend", handleDragFinished);
    window.addEventListener("drop", handleDragFinished);
    return () => {
      window.removeEventListener("dragend", handleDragFinished);
      window.removeEventListener("drop", handleDragFinished);
    };
  }, []);

  const onDragStart = (event: DragEvent<HTMLButtonElement>, gate: GateName) => {
    event.dataTransfer.setData("application/x-qcp-gate", gate);
    event.dataTransfer.effectAllowed = "copy";
    setIsDragging(true);
    setSuppressedGate(gate);
    setHoveredGate((current) => (current === gate ? null : current));
  };

  const onDragEnd = () => {
    setIsDragging(false);
  };

  const onMouseEnter = (gate: GateName) => {
    if (isDragging || suppressedGate === gate) {
      return;
    }
    setHoveredGate(gate);
  };

  const onMouseLeave = (gate: GateName) => {
    setHoveredGate((current) => (current === gate ? null : current));
    setSuppressedGate((current) => (current === gate ? null : current));
  };

  const onFocus = (gate: GateName) => {
    if (isDragging || suppressedGate === gate) {
      return;
    }
    setFocusedGate(gate);
  };

  const onBlur = (gate: GateName) => {
    setFocusedGate((current) => (current === gate ? null : current));
    setSuppressedGate((current) => (current === gate ? null : current));
  };

  const activeGate = isDragging
    ? null
    : hoveredGate && suppressedGate !== hoveredGate
      ? hoveredGate
      : focusedGate && suppressedGate !== focusedGate
        ? focusedGate
        : null;

  return (
    <section
      data-testid="gate-palette-panel"
      style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}
    >
      <h3 style={{ marginTop: 0 }}>门库</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {orderedItems.map((item) => (
          <div key={item.name} style={{ position: "relative" }}>
            <button
              type="button"
              draggable
              onDragStart={(event) => onDragStart(event, item.name)}
              onDragEnd={onDragEnd}
              onMouseEnter={() => onMouseEnter(item.name)}
              onMouseLeave={() => onMouseLeave(item.name)}
              onFocus={() => onFocus(item.name)}
              onBlur={() => onBlur(item.name)}
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
    </section>
  );
}

export default GatePalette;
