import type { DragEvent } from "react";

import {
  GATE_DRAG_MIME,
  MOVE_OPERATION_DRAG_MIME,
  decodeOperationMoveDragPayload,
  type OperationMoveDragPayload,
} from "./canvas-drag-mime";

interface UseCircuitCanvasDragEventsOptions {
  readonly showGateDragPreview: (
    qubit: number,
    layer: number,
    payload?: OperationMoveDragPayload | null,
  ) => void;
  readonly clearHoveredCell: (qubit: number, layer: number) => void;
  readonly onDropGate: (rawGate: string, qubit: number, layer: number) => void;
  readonly onDropMovedOperation: (
    payload: OperationMoveDragPayload | null,
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
  const getMovePayload = (
    event: DragEvent<HTMLDivElement>,
  ): OperationMoveDragPayload | null => {
    const raw = event.dataTransfer.getData(MOVE_OPERATION_DRAG_MIME);
    if (!raw) {
      return null;
    }
    return decodeOperationMoveDragPayload(raw);
  };

  const isSupportedDragEvent = (event: DragEvent<HTMLDivElement>): boolean => {
    const movePayload = getMovePayload(event);
    if (movePayload) {
      return true;
    }
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
    showGateDragPreview(qubit, layer, getMovePayload(event));
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
    showGateDragPreview(qubit, layer, getMovePayload(event));
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

    const movePayload = getMovePayload(event);
    const hasMoveType = Array.from(event.dataTransfer?.types ?? []).includes(
      MOVE_OPERATION_DRAG_MIME,
    );
    if (hasMoveType || movePayload) {
      onDropMovedOperation(movePayload, qubit, layer);
      return;
    }

    const rawGate = event.dataTransfer.getData(GATE_DRAG_MIME);
    if (rawGate) {
      onDropGate(rawGate, qubit, layer);
      return;
    }

    onDropMovedOperation(null, qubit, layer);
  };

  return {
    onDragEnterCell,
    onDragOverCell,
    onDragLeaveCell,
    onDropCell,
  };
}
