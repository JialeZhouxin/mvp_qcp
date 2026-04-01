import type { DragEvent } from "react";

import {
  GATE_DRAG_MIME,
  MOVE_OPERATION_DRAG_MIME,
  decodeOperationMoveDragPayload,
  type OperationMoveDragPayload,
} from "./canvas-drag-mime";

interface UseCircuitCanvasDragEventsOptions {
  readonly showGateDragPreview: (qubit: number, layer: number) => void;
  readonly clearHoveredCell: (qubit: number, layer: number) => void;
  readonly onDropGate: (rawGate: string, qubit: number, layer: number) => void;
  readonly onDropMovedOperation: (
    payload: OperationMoveDragPayload,
    qubit: number,
    layer: number,
  ) => void;
}

export function useCircuitCanvasDragEvents({
  showGateDragPreview,
  clearHoveredCell,
  onDropGate,
  onDropMovedOperation,
}: UseCircuitCanvasDragEventsOptions) {
  const isSupportedDragEvent = (event: DragEvent<HTMLDivElement>): boolean => {
    const types = Array.from(event.dataTransfer?.types ?? []);
    return types.includes(GATE_DRAG_MIME) || types.includes(MOVE_OPERATION_DRAG_MIME);
  };

  const onDragEnterCell = (
    event: DragEvent<HTMLDivElement>,
    qubit: number,
    layer: number,
  ) => {
    event.preventDefault();
    if (!isSupportedDragEvent(event)) {
      return;
    }
    showGateDragPreview(qubit, layer);
  };

  const onDragOverCell = (
    event: DragEvent<HTMLDivElement>,
    qubit: number,
    layer: number,
  ) => {
    event.preventDefault();
    if (!isSupportedDragEvent(event)) {
      return;
    }
    showGateDragPreview(qubit, layer);
  };

  const onDragLeaveCell = (
    event: DragEvent<HTMLDivElement>,
    qubit: number,
    layer: number,
  ) => {
    if (!isSupportedDragEvent(event)) {
      return;
    }
    const related = event.relatedTarget;
    if (related instanceof Node && event.currentTarget.contains(related)) {
      return;
    }
    clearHoveredCell(qubit, layer);
  };

  const onDropCell = (event: DragEvent<HTMLDivElement>, qubit: number, layer: number) => {
    event.preventDefault();

    const rawMovePayload = event.dataTransfer.getData(MOVE_OPERATION_DRAG_MIME);
    if (rawMovePayload) {
      const payload = decodeOperationMoveDragPayload(rawMovePayload);
      if (payload) {
        onDropMovedOperation(payload, qubit, layer);
        return;
      }
    }

    const rawGate = event.dataTransfer.getData(GATE_DRAG_MIME);
    if (!rawGate) {
      return;
    }
    onDropGate(rawGate, qubit, layer);
  };

  return {
    onDragEnterCell,
    onDragOverCell,
    onDragLeaveCell,
    onDropCell,
  };
}
