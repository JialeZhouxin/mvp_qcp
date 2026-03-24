import { renderHook } from "@testing-library/react";

import { useCircuitCanvasDragEvents } from "../features/circuit/components/use-circuit-canvas-drag-events";

const GATE_DRAG_MIME = "application/x-qcp-gate";

function createDragEventPayload(types: string[], gate = "h") {
  return {
    preventDefault: vi.fn(),
    currentTarget: { contains: vi.fn().mockReturnValue(false) },
    relatedTarget: null,
    dataTransfer: {
      types,
      getData: (type: string) => (type === GATE_DRAG_MIME ? gate : ""),
    },
  } as unknown as React.DragEvent<HTMLDivElement>;
}

describe("useCircuitCanvasDragEvents", () => {
  it("only shows preview for gate drag mime and forwards non-empty dropped gates", () => {
    const showGateDragPreview = vi.fn();
    const clearHoveredCell = vi.fn();
    const onDropGate = vi.fn();

    const { result } = renderHook(() =>
      useCircuitCanvasDragEvents({
        showGateDragPreview,
        clearHoveredCell,
        onDropGate,
      }),
    );

    const ignored = createDragEventPayload(["text/plain"], "");
    result.current.onDragEnterCell(ignored, 0, 0);
    result.current.onDragOverCell(ignored, 0, 0);
    result.current.onDragLeaveCell(ignored, 0, 0);
    result.current.onDropCell(ignored, 0, 0);

    expect(showGateDragPreview).not.toHaveBeenCalled();
    expect(clearHoveredCell).not.toHaveBeenCalled();
    expect(onDropGate).not.toHaveBeenCalled();

    const accepted = createDragEventPayload([GATE_DRAG_MIME], "cx");
    result.current.onDragEnterCell(accepted, 1, 2);
    result.current.onDragOverCell(accepted, 1, 2);
    result.current.onDragLeaveCell(accepted, 1, 2);
    result.current.onDropCell(accepted, 1, 2);

    expect(showGateDragPreview).toHaveBeenNthCalledWith(1, 1, 2);
    expect(showGateDragPreview).toHaveBeenNthCalledWith(2, 1, 2);
    expect(clearHoveredCell).toHaveBeenCalledWith(1, 2);
    expect(onDropGate).toHaveBeenCalledWith("cx", 1, 2);
  });
});
