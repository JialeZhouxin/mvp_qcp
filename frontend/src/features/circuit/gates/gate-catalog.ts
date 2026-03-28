import type { GateName } from "../model/types";

export type GateCategory = "single" | "controlled" | "entangling" | "measurement";
export type GatePlacementKind = "single" | "two-qubit" | "multi-control";

export interface GateCatalogItem {
  readonly name: GateName;
  readonly label: string;
  readonly category: GateCategory;
  readonly colorToken: string;
  readonly parameterLabels: readonly string[];
  readonly placementKind: GatePlacementKind;
  readonly controlCount: number;
  readonly targetCount: number;
}

const CATEGORY_COLORS: Readonly<Record<GateCategory, string>> = Object.freeze({
  single: "#1d4ed8",
  controlled: "#15803d",
  entangling: "#b45309",
  measurement: "#4b5563",
});

const GATE_CATALOG: readonly GateCatalogItem[] = Object.freeze([
  { name: "i", label: "I", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: [], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "x", label: "X", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: [], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "y", label: "Y", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: [], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "z", label: "Z", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: [], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "h", label: "H", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: [], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "sx", label: "SX", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: [], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "sy", label: "√Y", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: [], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "s", label: "S", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: [], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "sdg", label: "SDG", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: [], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "t", label: "T", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: [], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "tdg", label: "TDG", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: [], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "rx", label: "RX", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: ["theta"], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "ry", label: "RY", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: ["theta"], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "rz", label: "RZ", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: ["theta"], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "u", label: "U", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: ["theta", "phi", "lambda"], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "p", label: "P", category: "single", colorToken: CATEGORY_COLORS.single, parameterLabels: ["lambda"], placementKind: "single", controlCount: 0, targetCount: 1 },
  { name: "cx", label: "CX", category: "controlled", colorToken: CATEGORY_COLORS.controlled, parameterLabels: [], placementKind: "two-qubit", controlCount: 1, targetCount: 1 },
  { name: "cy", label: "CY", category: "controlled", colorToken: CATEGORY_COLORS.controlled, parameterLabels: [], placementKind: "two-qubit", controlCount: 1, targetCount: 1 },
  { name: "ch", label: "CH", category: "controlled", colorToken: CATEGORY_COLORS.controlled, parameterLabels: [], placementKind: "two-qubit", controlCount: 1, targetCount: 1 },
  { name: "cp", label: "CP", category: "controlled", colorToken: CATEGORY_COLORS.controlled, parameterLabels: ["lambda"], placementKind: "two-qubit", controlCount: 1, targetCount: 1 },
  { name: "cz", label: "CZ", category: "controlled", colorToken: CATEGORY_COLORS.controlled, parameterLabels: [], placementKind: "two-qubit", controlCount: 1, targetCount: 1 },
  { name: "ccx", label: "CCX", category: "controlled", colorToken: CATEGORY_COLORS.controlled, parameterLabels: [], placementKind: "multi-control", controlCount: 2, targetCount: 1 },
  { name: "ccz", label: "CCZ", category: "controlled", colorToken: CATEGORY_COLORS.controlled, parameterLabels: [], placementKind: "multi-control", controlCount: 2, targetCount: 1 },
  { name: "swap", label: "SWAP", category: "controlled", colorToken: CATEGORY_COLORS.controlled, parameterLabels: [], placementKind: "two-qubit", controlCount: 0, targetCount: 2 },
  { name: "cswap", label: "CSWAP", category: "controlled", colorToken: CATEGORY_COLORS.controlled, parameterLabels: [], placementKind: "multi-control", controlCount: 1, targetCount: 2 },
  { name: "rxx", label: "RXX", category: "entangling", colorToken: CATEGORY_COLORS.entangling, parameterLabels: ["theta"], placementKind: "two-qubit", controlCount: 0, targetCount: 2 },
  { name: "ryy", label: "RYY", category: "entangling", colorToken: CATEGORY_COLORS.entangling, parameterLabels: ["theta"], placementKind: "two-qubit", controlCount: 0, targetCount: 2 },
  { name: "rzz", label: "RZZ", category: "entangling", colorToken: CATEGORY_COLORS.entangling, parameterLabels: ["theta"], placementKind: "two-qubit", controlCount: 0, targetCount: 2 },
  { name: "rzx", label: "RZX", category: "entangling", colorToken: CATEGORY_COLORS.entangling, parameterLabels: ["theta"], placementKind: "two-qubit", controlCount: 0, targetCount: 2 },
  { name: "m", label: "M", category: "measurement", colorToken: CATEGORY_COLORS.measurement, parameterLabels: [], placementKind: "single", controlCount: 0, targetCount: 1 },
]);

function createCatalogMap(
  catalog: readonly GateCatalogItem[],
): Readonly<Record<GateName, GateCatalogItem>> {
  const byName = {} as Record<GateName, GateCatalogItem>;
  for (const item of catalog) {
    byName[item.name] = item;
  }
  return Object.freeze(byName);
}

const GATE_CATALOG_MAP = createCatalogMap(GATE_CATALOG);

export function getGateCatalog(): readonly GateCatalogItem[] {
  return GATE_CATALOG;
}

export function getGateCatalogItem(name: GateName): GateCatalogItem {
  return GATE_CATALOG_MAP[name];
}

export function getGateCategoryColor(category: GateCategory): string {
  return CATEGORY_COLORS[category];
}
