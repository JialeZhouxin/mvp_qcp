import { useEffect, useMemo, useState, type DragEvent } from "react";

import {
  getGateCatalog,
  type GateCatalogItem,
  type GateCategory,
} from "../gates/gate-catalog";
import type { GateName } from "../model/types";
import GateMatrixTooltip from "./GateMatrixTooltip";
import { WorkbenchControlButton } from "./WorkbenchControls";
import "./WorkbenchControls.css";

const CATEGORY_ORDER: readonly GateCategory[] = [
  "single",
  "controlled",
  "entangling",
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
    entangling: [],
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
    setFocusedGate((current) => (current === gate ? current : null));
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
    <section data-testid="gate-palette-panel" className="gate-palette-panel">
      <h3 className="gate-palette-heading">Gate Library</h3>
      <div className="gate-palette-grid">
        {orderedItems.map((item) => (
          <div key={item.name} className="gate-palette-item">
            <WorkbenchControlButton
              draggable
              onDragStart={(event) => onDragStart(event, item.name)}
              onDragEnd={onDragEnd}
              onMouseEnter={() => onMouseEnter(item.name)}
              onMouseLeave={() => onMouseLeave(item.name)}
              onFocus={() => onFocus(item.name)}
              onBlur={() => onBlur(item.name)}
              data-testid={`gate-${item.name}`}
              className="gate-palette-button"
              variant="surface"
              accentTone={item.category}
              accentColor={item.colorToken}
              accentTestId={`gate-accent-${item.name}`}
            >
              <span className="gate-palette-button__label">{item.label}</span>
            </WorkbenchControlButton>
            {showMatrixTooltip && activeGate === item.name ? (
              <GateMatrixTooltip gate={item.name} accentColor={item.colorToken} />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export default GatePalette;
