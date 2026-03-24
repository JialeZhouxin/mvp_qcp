import type { DragEvent } from "react";

const GATE_DRAG_MIME = "application/x-qcp-gate";

interface UseCircuitCanvasDragEventsOptions {
  readonly showGateDragPreview: (qubit: number, layer: number) => void;
  readonly clearHoveredCell: (qubit: number, layer: number) => void;
  readonly onDropGate: (rawGate: string, qubit: number, layer: number) => void;
}

export function useCircuitCanvasDragEvents({
  showGateDragPreview,
  clearHoveredCell,
  onDropGate,
}: UseCircuitCanvasDragEventsOptions) {
  const isGateDragEvent = (event: DragEvent<HTMLDivElement>): boolean => {
    const types = Array.from(event.dataTransfer?.types ?? []);
    return types.includes(GATE_DRAG_MIME);
  };

  const onDragEnterCell = (
    event: DragEvent<HTMLDivElement>,
    qubit: number,
    layer: number,
  ) => {
    event.preventDefault();
    if (!isGateDragEvent(event)) {
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
    if (!isGateDragEvent(event)) {
      return;
    }
    showGateDragPreview(qubit, layer);
  };

  const onDragLeaveCell = (
    event: DragEvent<HTMLDivElement>,
    qubit: number,
    layer: number,
  ) => {
    if (!isGateDragEvent(event)) {
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
