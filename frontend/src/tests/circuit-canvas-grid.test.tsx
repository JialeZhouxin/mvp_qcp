import { render, screen, within } from "@testing-library/react";

import type { CircuitModel } from "../features/circuit/model/types";
import CircuitCanvasGrid from "../features/circuit/components/CircuitCanvasGrid";

describe("CircuitCanvasGrid", () => {
  it("renders the inline parameter editor only on the selected anchor cell", () => {
    const circuit: CircuitModel = {
      numQubits: 2,
      operations: [{ id: "op-cp", gate: "cp", controls: [0], targets: [1], layer: 0, params: [0.25] }],
    };

    render(
      <CircuitCanvasGrid
        circuit={circuit}
        qubits={[0, 1]}
        layerIndexes={[0, 1]}
        layerCellWidths={[40, 40]}
        selectedOperationId="op-cp"
        activeParameterValues={[0.25]}
        parameterFeedback={{}}
        getCellClassName={() => "canvas-cell"}
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

    expect(screen.getAllByTestId("inline-operation-params-panel")).toHaveLength(1);
    expect(
      within(screen.getByTestId("canvas-cell-0-0")).getByTestId("inline-operation-params-panel"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("canvas-cell-1-0")).queryByTestId("inline-operation-params-panel"),
    ).not.toBeInTheDocument();
  });
});
