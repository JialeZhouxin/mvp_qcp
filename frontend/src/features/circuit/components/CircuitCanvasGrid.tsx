import {
  type DragEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Operation } from "../model/types";
import {
  type OperationMoveDragPayload,
  MOVE_OPERATION_DRAG_MIME,
  encodeOperationMoveDragPayload,
} from "./canvas-drag-mime";
import {
  buildConnectorSpans,
  findConnectorOperationAtCell,
  findOperationAtCell,
  GateLabel,
} from "./circuit-canvas-helpers";
import { isParameterizedGate } from "./canvas-gate-utils";
import OperationParameterPanel from "./OperationParameterPanel";
import type { ParameterValidationResult } from "./parameter-validation";

function isInlineAnchorCell(operation: Operation, qubit: number): boolean {
  const touchedQubits = [...operation.targets, ...(operation.controls ?? [])];
  return qubit === Math.min(...touchedQubits);
}

interface ConnectorLine {
  readonly operationId?: string;
  readonly preview: boolean;
  readonly x: number;
  readonly y1: number;
  readonly y2: number;
  readonly selected: boolean;
  readonly future: boolean;
}

const EMPTY_OPERATION_IDS: readonly string[] = [];

interface MovedOperationPreview {
  readonly operationId: string;
  readonly layer: number;
  readonly targets: readonly number[];
  readonly controls?: readonly number[];
}

export interface CircuitCanvasGridProps {
  readonly circuit: {
    readonly operations: readonly Operation[];
  };
  readonly qubits: readonly number[];
  readonly layerIndexes: readonly number[];
  readonly layerCellWidths: readonly number[];
  readonly selectedOperationId: string | null;
  readonly futureOperationIds?: readonly string[];
  readonly movedOperationPreview: MovedOperationPreview | null;
  readonly activeParameterValues: readonly number[];
  readonly parameterFeedback: Readonly<Record<number, ParameterValidationResult>>;
  readonly getCellClassName: (operation: Operation | undefined, qubit: number, layer: number) => string;
  readonly onDropCell: (event: DragEvent<HTMLDivElement>, qubit: number, layer: number) => void;
  readonly onDragEnterCell: (event: DragEvent<HTMLDivElement>, qubit: number, layer: number) => void;
  readonly onDragOverCell: (event: DragEvent<HTMLDivElement>, qubit: number, layer: number) => void;
  readonly onDragLeaveCell: (event: DragEvent<HTMLDivElement>, qubit: number, layer: number) => void;
  readonly onDragStartOperation: (payload: OperationMoveDragPayload) => void;
  readonly onDragEndOperation: () => void;
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
  futureOperationIds,
  movedOperationPreview,
  activeParameterValues,
  parameterFeedback,
  getCellClassName,
  onDropCell,
  onDragEnterCell,
  onDragOverCell,
  onDragLeaveCell,
  onDragStartOperation,
  onDragEndOperation,
  onCellClick,
  onDelete,
  onParamChange,
  onNormalizeParam,
}: CircuitCanvasGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });
  const [connectorLines, setConnectorLines] = useState<readonly ConnectorLine[]>([]);

  const connectorSpans = useMemo(() => buildConnectorSpans(circuit.operations), [circuit.operations]);
  const resolvedFutureOperationIds = futureOperationIds ?? EMPTY_OPERATION_IDS;
  const futureOperationSet = useMemo(
    () => new Set(resolvedFutureOperationIds),
    [resolvedFutureOperationIds],
  );

  const setCellRef = useCallback((qubit: number, layer: number, element: HTMLDivElement | null) => {
    const key = `${qubit}-${layer}`;
    if (element) {
      cellRefs.current.set(key, element);
      return;
    }
    cellRefs.current.delete(key);
  }, []);

  const recomputeConnectorLines = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) {
      return;
    }

    const gridRect = grid.getBoundingClientRect();
    const nextLines = connectorSpans
      .map((span) => {
        const startCell = cellRefs.current.get(`${span.minQubit}-${span.layer}`);
        const endCell = cellRefs.current.get(`${span.maxQubit}-${span.layer}`);
        if (!startCell || !endCell) {
          return null;
        }

        const startRect = startCell.getBoundingClientRect();
        const endRect = endCell.getBoundingClientRect();

        return {
          preview: false,
          operationId: span.operationId,
          x: startRect.left + startRect.width / 2 - gridRect.left,
          y1: startRect.top + startRect.height / 2 - gridRect.top,
          y2: endRect.top + endRect.height / 2 - gridRect.top,
          selected: selectedOperationId === span.operationId,
          future: futureOperationSet.has(span.operationId),
        };
      })
      .filter((line): line is ConnectorLine => line !== null);

    if (movedOperationPreview) {
      const touchedQubits = [
        ...movedOperationPreview.targets,
        ...(movedOperationPreview.controls ?? []),
      ];
      if (touchedQubits.length >= 2) {
        const minQubit = Math.min(...touchedQubits);
        const maxQubit = Math.max(...touchedQubits);
        const startCell = cellRefs.current.get(`${minQubit}-${movedOperationPreview.layer}`);
        const endCell = cellRefs.current.get(`${maxQubit}-${movedOperationPreview.layer}`);
        if (startCell && endCell) {
          const startRect = startCell.getBoundingClientRect();
          const endRect = endCell.getBoundingClientRect();
          nextLines.push({
            preview: true,
            x: startRect.left + startRect.width / 2 - gridRect.left,
            y1: startRect.top + startRect.height / 2 - gridRect.top,
            y2: endRect.top + endRect.height / 2 - gridRect.top,
            selected: false,
            future: false,
          });
        }
      }
    }

    setOverlaySize({
      width: Math.max(0, grid.clientWidth),
      height: Math.max(0, grid.clientHeight),
    });
    setConnectorLines(nextLines);
  }, [connectorSpans, futureOperationSet, movedOperationPreview, selectedOperationId]);

  useLayoutEffect(() => {
    recomputeConnectorLines();
  }, [recomputeConnectorLines, qubits, layerIndexes, layerCellWidths]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      recomputeConnectorLines();
    });
    observer.observe(grid);
    return () => observer.disconnect();
  }, [recomputeConnectorLines]);

  useEffect(() => {
    const onResize = () => {
      recomputeConnectorLines();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recomputeConnectorLines]);

  return (
    <div className="canvas-grid" ref={gridRef}>
      <svg
        className="canvas-connector-overlay"
        data-testid="canvas-connector-overlay"
        width={overlaySize.width}
        height={overlaySize.height}
        viewBox={`0 0 ${Math.max(1, overlaySize.width)} ${Math.max(1, overlaySize.height)}`}
        aria-hidden="true"
      >
        {connectorLines.map((line) => (
          <line
            key={
              line.preview
                ? "connector-line-preview"
                : `connector-line-${line.operationId ?? "unknown"}`
            }
            data-testid={
              line.preview
                ? "canvas-connector-line-preview"
                : `canvas-connector-line-${line.operationId ?? "unknown"}`
            }
            className={[
              "canvas-connector-line",
              line.selected ? "canvas-connector-line--selected" : "",
              line.future ? "canvas-connector-line--future" : "",
              line.preview ? "canvas-connector-line--preview" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            x1={line.x}
            y1={line.y1}
            x2={line.x}
            y2={line.y2}
          />
        ))}
      </svg>
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
              const connectorOperation = findConnectorOperationAtCell(
                circuit.operations,
                qubit,
                layer,
              );
              const draggedOperation = operation ?? connectorOperation;
              const isSelectedOperation =
                selectedOperationId !== null && operation?.id === selectedOperationId;
              return (
                <div
                  key={`${qubit}-${layer}`}
                  draggable={draggedOperation !== undefined}
                  onDragStart={(event) => {
                    if (!draggedOperation) {
                      return;
                    }
                    event.dataTransfer.setData(
                      MOVE_OPERATION_DRAG_MIME,
                      encodeOperationMoveDragPayload({
                        operationId: draggedOperation.id,
                        anchorQubit: qubit,
                        sourceLayer: draggedOperation.layer,
                      }),
                    );
                    event.dataTransfer.effectAllowed = "move";
                    onDragStartOperation({
                      operationId: draggedOperation.id,
                      anchorQubit: qubit,
                      sourceLayer: draggedOperation.layer,
                    });
                  }}
                  onDragEnd={onDragEndOperation}
                  onDrop={(event) => onDropCell(event, qubit, layer)}
                  onDragEnter={(event) => onDragEnterCell(event, qubit, layer)}
                  onDragOver={(event) => onDragOverCell(event, qubit, layer)}
                  onDragLeave={(event) => onDragLeaveCell(event, qubit, layer)}
                  onClick={() => onCellClick(qubit, layer)}
                  className={getCellClassName(operation, qubit, layer)}
                  style={{
                    "--canvas-cell-width": `${layerCellWidths[layer] ?? 40}px`,
                  }}
                  ref={(element) => setCellRef(qubit, layer, element)}
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
