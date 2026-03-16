import { render } from "@testing-library/react";

import ResultChart from "../components/ResultChart";

type EchartProps = {
  option: {
    xAxis: { data: string[] };
    tooltip: { formatter: (param: { data?: { state?: string; probability?: number } }) => string };
    series: Array<{
      label: { show: boolean; formatter: (param: { value?: number }) => string };
    }>;
  };
};

const { echartsRenderSpy } = vi.hoisted(() => ({
  echartsRenderSpy: vi.fn(),
}));

vi.mock("echarts-for-react", () => ({
  default: (props: EchartProps) => {
    echartsRenderSpy(props);
    return <div data-testid="mock-echarts" />;
  },
}));

describe("ResultChart", () => {
  beforeEach(() => {
    echartsRenderSpy.mockReset();
  });

  it("formats axis labels, value labels and tooltip with 3 digits", () => {
    render(
      <ResultChart
        probabilities={{ "11": 0.5, "00": 0.2, "01": 0.2, "10": 0.1 }}
        sortMode="BASIS"
        stateLabelFormatter={(state) => `|${state}>`}
        valueDigits={3}
        showBarValueLabel
      />,
    );

    const option = (echartsRenderSpy.mock.calls.at(-1)?.[0] as EchartProps).option;
    expect(option.xAxis.data).toEqual(["|00>", "|01>", "|10>", "|11>"]);
    expect(option.series[0].label.show).toBe(true);
    expect(option.series[0].label.formatter({ value: 0.5 })).toBe("0.500");
    expect(option.tooltip.formatter({ data: { state: "11", probability: 0.5 } })).toBe(
      "|11> : 0.500",
    );
  });

  it("sorts by probability in descending order when mode is PROB_DESC", () => {
    render(
      <ResultChart
        probabilities={{ "11": 0.5, "00": 0.2, "01": 0.2, "10": 0.1 }}
        sortMode="PROB_DESC"
        stateLabelFormatter={(state) => `|${state}>`}
      />,
    );

    const option = (echartsRenderSpy.mock.calls.at(-1)?.[0] as EchartProps).option;
    expect(option.xAxis.data).toEqual(["|11>", "|00>", "|01>", "|10>"]);
  });
});
