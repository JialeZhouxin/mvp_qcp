import type { CircuitModel } from "./types";

export interface CircuitTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface LoadCircuitTemplateOptions {
  readonly numQubits?: number;
  readonly includeSwaps?: boolean;
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

const STATIC_TEMPLATE_MAP: Record<string, CircuitModel> = {
  bell: BELL_TEMPLATE,
  superposition: SUPERPOSITION_TEMPLATE,
};

function cloneCircuitModel(model: CircuitModel): CircuitModel {
  return {
    numQubits: model.numQubits,
    operations: model.operations.map((operation) => ({
      ...operation,
      targets: [...operation.targets],
      controls: operation.controls ? [...operation.controls] : undefined,
      params: operation.params ? [...operation.params] : undefined,
    })),
  };
}

function createQftTemplate(numQubits: number, includeSwaps: boolean): CircuitModel {
  if (!Number.isInteger(numQubits) || numQubits < 2 || numQubits > 32) {
    throw new Error("qft numQubits must be an integer between 2 and 32");
  }

  let operationIndex = 1;
  let layer = 0;
  const operations: CircuitModel["operations"] = [];

  const addOperation = (
    gate: CircuitModel["operations"][number]["gate"],
    targets: readonly number[],
    controls?: readonly number[],
    params?: readonly number[],
  ) => {
    operations.push({
      id: `tpl-qft-${operationIndex}`,
      gate,
      targets: [...targets],
      controls: controls ? [...controls] : undefined,
      params: params ? [...params] : undefined,
      layer,
    });
    operationIndex += 1;
    layer += 1;
  };

  for (let target = 0; target < numQubits; target += 1) {
    addOperation("h", [target]);
    for (let control = target + 1; control < numQubits; control += 1) {
      const theta = Math.PI / 2 ** (control - target);
      addOperation("cp", [target], [control], [theta]);
    }
  }

  if (includeSwaps) {
    for (let left = 0; left < Math.floor(numQubits / 2); left += 1) {
      addOperation("swap", [left, numQubits - left - 1]);
    }
  }

  for (let qubit = 0; qubit < numQubits; qubit += 1) {
    addOperation("m", [qubit]);
  }

  return { numQubits, operations };
}

function createGroverTemplate(): CircuitModel {
  const dataQubits = [0, 1, 2, 3] as const;
  const ancillaQubit = 4;
  const markedPatterns = [
    [0, 0, 0, 1],
    [0, 0, 1, 0],
    [1, 1, 0, 1],
    [1, 1, 1, 0],
  ] as const;
  let operationIndex = 1;
  let layer = 0;
  const operations: CircuitModel["operations"] = [];

  const addOperation = (
    gate: CircuitModel["operations"][number]["gate"],
    targets: readonly number[],
    controls?: readonly number[],
    params?: readonly number[],
  ) => {
    operations.push({
      id: `tpl-grover-${operationIndex}`,
      gate,
      targets: [...targets],
      controls: controls ? [...controls] : undefined,
      params: params ? [...params] : undefined,
      layer,
    });
    operationIndex += 1;
    layer += 1;
  };

  const addPhaseFlipOnAllOnes = () => {
    addOperation("ccx", [ancillaQubit], [0, 1]);
    addOperation("ccz", [3], [ancillaQubit, 2]);
    addOperation("ccx", [ancillaQubit], [0, 1]);
  };

  for (const qubit of dataQubits) {
    addOperation("h", [qubit]);
  }

  for (const pattern of markedPatterns) {
    for (let qubit = 0; qubit < dataQubits.length; qubit += 1) {
      if (pattern[qubit] === 0) {
        addOperation("x", [dataQubits[qubit]]);
      }
    }

    addPhaseFlipOnAllOnes();

    for (let qubit = 0; qubit < dataQubits.length; qubit += 1) {
      if (pattern[qubit] === 0) {
        addOperation("x", [dataQubits[qubit]]);
      }
    }
  }

  for (const qubit of dataQubits) {
    addOperation("h", [qubit]);
  }
  for (const qubit of dataQubits) {
    addOperation("x", [qubit]);
  }

  addPhaseFlipOnAllOnes();

  for (const qubit of dataQubits) {
    addOperation("x", [qubit]);
  }
  for (const qubit of dataQubits) {
    addOperation("h", [qubit]);
  }

  for (let qubit = 0; qubit <= ancillaQubit; qubit += 1) {
    addOperation("m", [qubit]);
  }

  return {
    numQubits: ancillaQubit + 1,
    operations,
  };
}

const GROVER_TEMPLATE = createGroverTemplate();

export function listCircuitTemplates(): readonly CircuitTemplate[] {
  return [
    {
      id: "bell",
      name: "Bell state",
      description: "2-qubit entangled Bell-state example.",
    },
    {
      id: "superposition",
      name: "Uniform superposition",
      description: "3-qubit uniform superposition example.",
    },
    {
      id: "qft",
      name: "QFT (n qubits)",
      description: "Configurable n-qubit quantum Fourier transform template.",
    },
    {
      id: "grover",
      name: "Grover (4+1)",
      description: "4 data qubits plus 1 ancilla Grover template for q0=q3 and q1!=q2.",
    },
  ];
}

export function loadCircuitTemplate(
  templateId: string,
  options: LoadCircuitTemplateOptions = {},
): CircuitModel {
  if (templateId === "qft") {
    const numQubits = options.numQubits ?? 4;
    return createQftTemplate(numQubits, options.includeSwaps ?? true);
  }

  if (templateId === "grover") {
    return cloneCircuitModel(GROVER_TEMPLATE);
  }

  const template = STATIC_TEMPLATE_MAP[templateId];
  if (!template) {
    throw new Error(`unknown circuit template: ${templateId}`);
  }

  return cloneCircuitModel(template);
}
