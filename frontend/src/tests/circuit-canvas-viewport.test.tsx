import { createRef, type CSSProperties } from "react";
import { render, screen } from "@testing-library/react";

import type { CircuitModel } from "../features/circuit/model/types";
import CircuitCanvasViewport from "../features/circuit/components/CircuitCanvasViewport";

describe("CircuitCanvasViewport", () => {
  it("renders viewport shell around the circuit grid", () => {
    const circuit: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "op-1", gate: "x", targets: [0], layer: 0 }],
    };

    render(
      <CircuitCanvasViewport
        viewportRef={createRef<HTMLDivElement>()}
        viewportClassName="canvas-viewport"
        viewportContentStyle={{ "--canvas-scale": 1 } as CSSProperties}
        circuit={circuit}
        qubits={[0]}
        layerIndexes={[0, 1]}
        layerCellWidths={[40, 40]}
        selectedOperationId="op-1"
        activeParameterValues={[]}
        parameterFeedback={{}}
        getCellClassName={() => "canvas-cell"}
        onViewportWheel={vi.fn()}
        onViewportPointerDown={vi.fn()}
        onViewportPointerMove={vi.fn()}
        onViewportPointerUp={vi.fn()}
        onViewportPointerCancel={vi.fn()}
        onDropCell={vi.fn()}
        onDragEnterCell={vi.fn()}
        onDragOverCell={vi.fn()}
        onDragLeaveCell={vi.fn()}
        onCellClick={vi.fn()}
        onDelete={vi.fn()}
        onParamChange={vi.fn()}
        onNormalizeParam={vi.fn()}
      />,
    );

    expect(screen.getByTestId("canvas-viewport-shell")).toContainElement(
      screen.getByTestId("canvas-viewport"),
    );
    expect(screen.getByTestId("canvas-cell-0-0")).toBeInTheDocument();
  });
});
