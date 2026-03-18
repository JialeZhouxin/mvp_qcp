import { describe, expect, it } from "vitest";

import { buildResultChartOption, type ResultChartEntry } from "../components/ResultChart";

const CHART_DATA: ResultChartEntry[] = [
  { state: "00", probability: 0.5, stateLabel: "|00>" },
  { state: "11", probability: 0.5, stateLabel: "|11>" },
];

describe("buildResultChartOption", () => {
  it("builds compact option with hidden title", () => {
    const option = buildResultChartOption({
      chartData: CHART_DATA,
      compact: true,
      showTitle: false,
      title: "ignored",
      valueDigits: 3,
      showBarValueLabel: true,
      formatState: (state) => `|${state}>`,
    });

    expect(option.title).toBeUndefined();
    expect(option.grid.top).toBe(12);
    expect(option.grid.bottom).toBe(28);
    expect(option.series[0].barMaxWidth).toBe(20);
    expect(option.series[0].label.show).toBe(true);
  });

  it("builds regular option with visible title", () => {
    const option = buildResultChartOption({
      chartData: CHART_DATA,
      compact: false,
      showTitle: true,
      title: "示例标题",
      valueDigits: 4,
      showBarValueLabel: false,
      formatState: (state) => state,
    });

    expect(option.title?.text).toBe("示例标题");
    expect(option.grid.top).toBe(50);
    expect(option.grid.bottom).toBe(48);
    expect(option.series[0].barMaxWidth).toBe(26);
    expect(option.series[0].label.show).toBe(false);
  });
});
