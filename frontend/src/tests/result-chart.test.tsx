import { describe, expect, it } from "vitest";

import {
  buildResultChartOption,
  resolveBarMaxWidth,
  type ResultChartEntry,
} from "../components/ResultChart";

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
      adaptiveBarWidth: false,
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
      adaptiveBarWidth: false,
    });

    expect(option.title?.text).toBe("示例标题");
    expect(option.grid.top).toBe(50);
    expect(option.grid.bottom).toBe(48);
    expect(option.series[0].barMaxWidth).toBe(26);
    expect(option.series[0].label.show).toBe(false);
  });

  it("uses legacy auto width when adaptive and bar count is small", () => {
    const option = buildResultChartOption({
      chartData: CHART_DATA,
      compact: true,
      showTitle: false,
      title: "ignored",
      valueDigits: 3,
      showBarValueLabel: true,
      formatState: (state) => `|${state}>`,
      adaptiveBarWidth: true,
    });

    expect(option.series[0].barMaxWidth).toBeUndefined();
  });
});

describe("resolveBarMaxWidth", () => {
  it("keeps fixed defaults when adaptive is disabled", () => {
    expect(resolveBarMaxWidth({ compact: true, barCount: 12, adaptiveBarWidth: false })).toBe(20);
    expect(resolveBarMaxWidth({ compact: false, barCount: 12, adaptiveBarWidth: false })).toBe(26);
  });

  it("shrinks width as bar count grows and clamps at min width", () => {
    const mid = resolveBarMaxWidth({ compact: true, barCount: 12, adaptiveBarWidth: true });
    const high = resolveBarMaxWidth({ compact: true, barCount: 24, adaptiveBarWidth: true });
    const capped = resolveBarMaxWidth({ compact: true, barCount: 200, adaptiveBarWidth: true });

    expect(mid).toBeTypeOf("number");
    expect(high).toBeTypeOf("number");
    expect((mid as number) > (high as number)).toBe(true);
    expect(capped).toBe(12);
  });
});
