import { fireEvent, render, screen } from "@testing-library/react";

import WorkbenchResultPanel from "../components/circuit/WorkbenchResultPanel";

const { chartPropsSpy } = vi.hoisted(() => ({
  chartPropsSpy: vi.fn(),
}));

vi.mock("../components/ResultChart", () => ({
  default: (props: unknown) => {
    chartPropsSpy(props);
    return <div data-testid="mock-result-chart">mock-result-chart</div>;
  },
}));

describe("WorkbenchResultPanel", () => {
  beforeEach(() => {
    chartPropsSpy.mockReset();
  });

  it("uses BASIS by default and supports toggling to PROB_DESC", () => {
    render(
      <WorkbenchResultPanel
        simulationState="READY"
        simError={null}
        displayMode="ALL"
        epsilonText="6.25e-2"
        probabilityView={{
          all: { "00": 0.5, "01": 0.1, "10": 0.05, "11": 0.35 },
          visible: { "00": 0.5, "01": 0.1, "10": 0.05, "11": 0.35 },
          hiddenCount: 0,
          totalCount: 4,
          visibleCount: 4,
          probabilitySum: 1,
          epsilon: 0.0625,
        }}
        probabilityDisplayView={{
          probabilities: { "00": 0.5, "01": 0.1, "10": 0.05, "11": 0.35 },
          visibleCount: 4,
          hiddenCount: 0,
        }}
        onDisplayModeChange={vi.fn()}
      />,
    );

    const firstCallProps = chartPropsSpy.mock.calls.at(-1)?.[0] as { sortMode: string };
    expect(firstCallProps.sortMode).toBe("BASIS");

    fireEvent.click(screen.getByTestId("sort-mode-prob-desc"));

    const latestCallProps = chartPropsSpy.mock.calls.at(-1)?.[0] as { sortMode: string };
    expect(latestCallProps.sortMode).toBe("PROB_DESC");
  });
});
