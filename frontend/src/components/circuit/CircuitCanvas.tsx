import type { DragEvent } from "react";
import { addOperation, removeOperation } from "../../features/circuit/model/circuit-model";
import type {
  CircuitModel,
  GateName,
  Operation,
} from "../../features/circuit/model/types";

const DEFAULT_MIN_LAYERS = 8;

interface CircuitCanvasProps {
  readonly circuit: CircuitModel;
  readonly onCircuitChange: (next: CircuitModel) => void;
  readonly minLayers?: number;
}

function getDefaultParams(gate: GateName): readonly number[] | undefined {
  if (gate === "rx" || gate === "ry" || gate === "rz") {
    return [0];
  }
  if (gate === "u") {
    return [0, 0, 0];
  }
  return undefined;
}

function findSecondaryTarget(
  numQubits: number,
  primary: number,
): number {
  if (primary + 1 < numQubits) {
    return primary + 1;
  }
  if (primary - 1 >= 0) {
    return primary - 1;
  }
  throw new Error("not enough qubits for two-qubit gate");
}

function buildOperation(
  gate: GateName,
  qubit: number,
  layer: number,
  numQubits: number,
) {
  if (gate === "cx" || gate === "cz") {
    const target = findSecondaryTarget(numQubits, qubit);
    return {
      gate,
      layer,
      controls: [qubit],
      targets: [target],
      params: getDefaultParams(gate),
    };
  }
  if (gate === "swap") {
    const other = findSecondaryTarget(numQubits, qubit);
    return {
      gate,
      layer,
      targets: [qubit, other],
      params: getDefaultParams(gate),
    };
  }
  return {
    gate,
    layer,
    targets: [qubit],
    params: getDefaultParams(gate),
  };
}

function includesQubit(operation: Operation, qubit: number): boolean {
  return operation.targets.includes(qubit) || operation.controls?.includes(qubit) === true;
}

function findOperationAtCell(
  operations: readonly Operation[],
  qubit: number,
  layer: number,
): Operation | undefined {
  return operations.find(
    (operation) => operation.layer === layer && includesQubit(operation, qubit),
  );
}

function computeLayerCount(circuit: CircuitModel, minLayers: number): number {
  const maxLayer = circuit.operations.reduce((max, operation) => Math.max(max, operation.layer), 0);
  return Math.max(minLayers, maxLayer + 2);
}

function GateLabel({ operation }: { operation: Operation }) {
  if (operation.controls && operation.controls.length > 0) {
    return (
      <span>
        {operation.gate.toUpperCase()} c{operation.controls[0]}→t{operation.targets[0]}
      </span>
    );
  }
  return <span>{operation.gate.toUpperCase()}</span>;
}

function CircuitCanvas({
  circuit,
  onCircuitChange,
  minLayers = DEFAULT_MIN_LAYERS,
}: CircuitCanvasProps) {
  const layers = computeLayerCount(circuit, minLayers);
  const qubits = Array.from({ length: circuit.numQubits }).map((_, index) => index);
  const layerIndexes = Array.from({ length: layers }).map((_, index) => index);

  const onDrop = (
    event: DragEvent<HTMLDivElement>,
    qubit: number,
    layer: number,
  ) => {
    event.preventDefault();
    const gate = event.dataTransfer.getData("application/x-qcp-gate") as GateName;
    if (!gate) {
      return;
    }
    const next = addOperation(
      circuit,
      buildOperation(gate, qubit, layer, circuit.numQubits),
    );
    onCircuitChange(next);
  };

  const onDelete = (operationId: string) => {
    onCircuitChange(removeOperation(circuit, operationId));
  };

  return (
    <section style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>量子线路</h3>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gap: 6 }}>
          {qubits.map((qubit) => (
            <div key={qubit} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <strong style={{ width: 36 }}>q{qubit}</strong>
              {layerIndexes.map((layer) => {
                const operation = findOperationAtCell(circuit.operations, qubit, layer);
                return (
                  <div
                    key={`${qubit}-${layer}`}
                    onDrop={(event) => onDrop(event, qubit, layer)}
                    onDragOver={(event) => event.preventDefault()}
                    data-testid={`canvas-cell-${qubit}-${layer}`}
                    style={{
                      width: 120,
                      minHeight: 42,
                      border: "1px dashed #bbb",
                      borderRadius: 6,
                      padding: "4px 6px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: operation ? "#f0f7ff" : "#fff",
                    }}
                  >
                    {operation ? <GateLabel operation={operation} /> : <span style={{ color: "#999" }}>-</span>}
                    {operation ? (
                      <button
                        type="button"
                        onClick={() => onDelete(operation.id)}
                        data-testid={`remove-op-${operation.id}`}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CircuitCanvas;
