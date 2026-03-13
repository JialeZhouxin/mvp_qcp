import type { CircuitModel } from "./types";

export interface CircuitTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

const BELL_TEMPLATE: CircuitModel = {
  numQubits: 2,
  operations: [
    { id: "tpl-bell-1", gate: "h", targets: [0], layer: 0 },
    { id: "tpl-bell-2", gate: "cx", controls: [0], targets: [1], layer: 1 },
    { id: "tpl-bell-3", gate: "m", targets: [0], layer: 2 },
    { id: "tpl-bell-4", gate: "m", targets: [1], layer: 3 },
  ],
};

const SUPERPOSITION_TEMPLATE: CircuitModel = {
  numQubits: 3,
  operations: [
    { id: "tpl-sup-1", gate: "h", targets: [0], layer: 0 },
    { id: "tpl-sup-2", gate: "h", targets: [1], layer: 0 },
    { id: "tpl-sup-3", gate: "h", targets: [2], layer: 0 },
    { id: "tpl-sup-4", gate: "m", targets: [0], layer: 1 },
    { id: "tpl-sup-5", gate: "m", targets: [1], layer: 2 },
    { id: "tpl-sup-6", gate: "m", targets: [2], layer: 3 },
  ],
};

const TEMPLATE_MAP: Record<string, CircuitModel> = {
  bell: BELL_TEMPLATE,
  superposition: SUPERPOSITION_TEMPLATE,
};

export function listCircuitTemplates(): readonly CircuitTemplate[] {
  return [
    {
      id: "bell",
      name: "Bell 态",
      description: "2 比特纠缠态示例，适合快速验证工作台流程。",
    },
    {
      id: "superposition",
      name: "均匀叠加态",
      description: "3 比特叠加态示例，便于观察多基态分布。",
    },
  ];
}

export function loadCircuitTemplate(templateId: string): CircuitModel {
  const template = TEMPLATE_MAP[templateId];
  if (!template) {
    throw new Error(`unknown circuit template: ${templateId}`);
  }
  return {
    numQubits: template.numQubits,
    operations: template.operations.map((operation) => ({
      ...operation,
      targets: [...operation.targets],
      controls: operation.controls ? [...operation.controls] : undefined,
      params: operation.params ? [...operation.params] : undefined,
    })),
  };
}
