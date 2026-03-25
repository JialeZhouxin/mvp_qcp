import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import CircuitWorkbenchPage from "../pages/CircuitWorkbenchPage";

describe("CircuitWorkbenchPage time step preview", () => {
  it("renders a time step slider in the canvas toolbar and resubmits truncated circuits while dimming future gates", async () => {
    const schedule = vi.fn(async (model: { numQubits: number; operations: readonly { id: string }[] }) => ({
      requestId: `sim-${model.operations.length}`,
      probabilities:
        model.numQubits === 2
          ? { "00": 1, "01": 0, "10": 0, "11": 0 }
          : { "0": 1, "1": 0 },
    }));

    render(
      <MemoryRouter>
        <CircuitWorkbenchPage scheduler={{ schedule }} />
      </MemoryRouter>,
    );

    const slider = await screen.findByTestId("canvas-time-step-slider");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "4");
    expect(slider).toHaveValue("4");
    expect(screen.getByTestId("canvas-time-step-value")).toHaveTextContent("4 / 4");

    await waitFor(() => {
      expect(schedule).toHaveBeenCalled();
      expect(schedule).toHaveBeenLastCalledWith(
        expect.objectContaining({
          operations: expect.arrayContaining([
            expect.objectContaining({ id: "tpl-bell-1" }),
            expect.objectContaining({ id: "tpl-bell-2" }),
            expect.objectContaining({ id: "tpl-bell-3" }),
            expect.objectContaining({ id: "tpl-bell-4" }),
          ]),
        }),
      );
    });

    fireEvent.change(slider, { target: { value: "2" } });

    await waitFor(() => {
      expect(schedule).toHaveBeenLastCalledWith(
        expect.objectContaining({
          operations: [
            expect.objectContaining({ id: "tpl-bell-1" }),
            expect.objectContaining({ id: "tpl-bell-2" }),
          ],
        }),
      );
    });

    expect(screen.getByTestId("canvas-time-step-value")).toHaveTextContent("2 / 4");
    expect(screen.getByTestId("canvas-cell-0-2")).toHaveClass("canvas-cell--preview-future");
    expect(screen.getByTestId("canvas-cell-1-3")).toHaveClass("canvas-cell--preview-future");

    fireEvent.change(slider, { target: { value: "0" } });

    await waitFor(() => {
      expect(schedule).toHaveBeenLastCalledWith(
        expect.objectContaining({
          operations: [],
        }),
      );
    });

    expect(screen.getByTestId("canvas-time-step-value")).toHaveTextContent("0 / 4");
  });
});
