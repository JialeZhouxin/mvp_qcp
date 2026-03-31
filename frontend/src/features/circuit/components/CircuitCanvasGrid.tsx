import type { DragEvent, MouseEvent } from "react";

import type { Operation } from "../model/types";
import { findOperationAtCell, GateLabel } from "./circuit-canvas-helpers";
import { isParameterizedGate } from "./canvas-gate-utils";
import OperationParameterPanel from "./OperationParameterPanel";
import type { ParameterValidationResult } from "./parameter-validation";

function isInlineAnchorCell(operation: Operation, qubit: number): boolean {
  const touchedQubits = [...operation.targets, ...(operation.controls ?? [])];
  return qubit === Math.min(...touchedQubits);
}

export interface CircuitCanvasGridProps {
  readonly circuit: {
    readonly operations: readonly Operation[];
  };
  readonly qubits: readonly number[];
  readonly layerIndexes: readonly number[];
  readonly layerCellWidths: readonly number[];
  readonly selectedOperationId: string | null;
  readonly activeParameterValues: readonly number[];
  readonly parameterFeedback: Readonly<Record<number, ParameterValidationResult>>;
  readonly getCellClassName: (operation: Operation | undefined, qubit: number, layer: number) => string;
  readonly onDropCell: (event: DragEvent<HTMLDivElement>, qubit: number, layer: number) => void;
  readonly onDragEnterCell: (event: DragEvent<HTMLDivElement>, qubit: number, layer: number) => void;
  readonly onDragOverCell: (event: DragEvent<HTMLDivElement>, qubit: number, layer: number) => void;
  readonly onDragLeaveCell: (event: DragEvent<HTMLDivElement>, qubit: number, layer: number) => void;
  readonly onCellClick: (qubit: number, layer: number) => void;
  readonly onDelete: (operationId: string) => void;
  readonly onParamChange: (index: number, value: number) => void;
  readonly onNormalizeParam: (index: number) => void;
}

function CircuitCanvasGrid({
  circuit,
  qubits,
  layerIndexes,
  layerCellWidths,
  selectedOperationId,
  activeParameterValues,
  parameterFeedback,
  getCellClassName,
  onDropCell,
  onDragEnterCell,
  onDragOverCell,
  onDragLeaveCell,
  onCellClick,
  onDelete,
  onParamChange,
  onNormalizeParam,
}: CircuitCanvasGridProps) {
  return (
    <div className="canvas-grid">
      {qubits.map((qubit) => (
        <div key={qubit} className="canvas-row" data-testid={`canvas-row-${qubit}`}>
          <strong className="canvas-row-label">q{qubit}</strong>
          <div className="canvas-row-track" data-testid={`canvas-row-track-${qubit}`}>
            <span
              className="canvas-row-wire"
              data-testid={`canvas-row-wire-${qubit}`}
              aria-hidden="true"
            />
            {layerIndexes.map((layer) => {
              const operation = findOperationAtCell(circuit.operations, qubit, layer);
              const isSelectedOperation =
                selectedOperationId !== null && operation?.id === selectedOperationId;
              return (
                <div
                  key={`${qubit}-${layer}`}
                  onDrop={(event) => onDropCell(event, qubit, layer)}
                  onDragEnter={(event) => onDragEnterCell(event, qubit, layer)}
                  onDragOver={(event) => onDragOverCell(event, qubit, layer)}
                  onDragLeave={(event) => onDragLeaveCell(event, qubit, layer)}
                  onClick={() => onCellClick(qubit, layer)}
                  className={getCellClassName(operation, qubit, layer)}
                  style={{
                    "--canvas-cell-width": `${layerCellWidths[layer] ?? 40}px`,
                  }}
                  tabIndex={operation ? 0 : undefined}
                  data-testid={`canvas-cell-${qubit}-${layer}`}
                >
                  {operation ? <GateLabel operation={operation} qubit={qubit} /> : null}
                  {operation &&
                  isSelectedOperation &&
                  isParameterizedGate(operation.gate) &&
                  isInlineAnchorCell(operation, qubit) ? (
                    <div
                      style={{
                        position: "absolute",
                        left: "calc(100% + 8px)",
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 3,
                        width: 220,
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid var(--border-subtle)",
                        background: "var(--surface-panel)",
                        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.12)",
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <OperationParameterPanel
                        operation={operation}
                        values={activeParameterValues}
                        feedback={parameterFeedback}
                        onParamChange={onParamChange}
                        onNormalizeParam={onNormalizeParam}
                        compact
                        testId="inline-operation-params-panel"
                      />
                    </div>
                  ) : null}
                  {operation ? (
                    <button
                      type="button"
                      onClick={(event: MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                        onDelete(operation.id);
                      }}
                      className="canvas-delete-btn"
                      aria-label={"\u5220\u9664 gate"}
                      data-testid={`remove-op-${operation.id}`}
                    >
                      {"\u00d7"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CircuitCanvasGrid;
