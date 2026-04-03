import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import WorkbenchHybridPanel from "../features/circuit/components/WorkbenchHybridPanel";
import {
  buildHybridConvergenceOption,
  formatObjectiveValue,
  HYBRID_CHART_MAX_WIDTH,
  HYBRID_CHART_MIN_WIDTH,
  HYBRID_CHART_PX_PER_POINT,
  HYBRID_CONVERGENCE_CONTAINER_WIDTH,
  resolveHybridChartWidth,
} from "../features/circuit/components/hybrid-convergence-chart";

const SAMPLE_POINTS = [
  { iteration: 1, objective: 0.9 },
  { iteration: 2, objective: 0.72 },
  { iteration: 3, objective: 0.64 },
];

const CHART_PALETTE = {
  textColor: "#111827",
  axisColor: "#4b5563",
  splitLineColor: "#e5e7eb",
  axisLineColor: "#d1d5db",
  lineColor: "#1677ff",
  tooltipBackground: "rgba(255, 255, 255, 0.96)",
  tooltipBorder: "#d1d5db",
};

function createIterations(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const iteration = index + 1;
    return {
      iteration,
      objective: Number((1 / (iteration + 1)).toFixed(6)),
      bestObjective: Number((1 / (iteration + 1)).toFixed(6)),
      currentBestGap: 0,
      updatedAt: new Date(2026, 0, 1, 0, 0, iteration).toISOString(),
    };
  });
}

describe("hybrid convergence chart option", () => {
  it("locks value-axis semantics and data mapping", () => {
    const option = buildHybridConvergenceOption({
      points: SAMPLE_POINTS,
      palette: CHART_PALETTE,
    });

    const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis;
    const series = Array.isArray(option.series) ? option.series[0] : undefined;

    expect(xAxis?.type).toBe("value");
    expect(series?.data).toEqual([
      [1, 0.9],
      [2, 0.72],
      [3, 0.64],
    ]);
  });

  it("enforces performance defaults", () => {
    const option = buildHybridConvergenceOption({
      points: SAMPLE_POINTS,
      palette: CHART_PALETTE,
    });
    const series = Array.isArray(option.series) ? option.series[0] : undefined;
    const tooltip = option.tooltip as { readonly trigger?: string } | undefined;

    expect(option.animation).toBe(false);
    expect(series?.showSymbol).toBe(false);
    expect(tooltip?.trigger).toBe("axis");
  });
});

describe("hybrid convergence width policy", () => {
  it("uses fixed constants and clamp formula", () => {
    expect(HYBRID_CHART_MIN_WIDTH).toBe(320);
    expect(HYBRID_CHART_PX_PER_POINT).toBe(6);
    expect(HYBRID_CHART_MAX_WIDTH).toBe(12000);

    expect(resolveHybridChartWidth(1)).toBe(320);
    expect(resolveHybridChartWidth(1000)).toBe(6000);
    expect(resolveHybridChartWidth(5000)).toBe(12000);
  });

  it("ensures N>=1000 width exceeds fixed container baseline", () => {
    const width = resolveHybridChartWidth(1000);
    expect(HYBRID_CONVERGENCE_CONTAINER_WIDTH).toBe(960);
    expect(width).toBeGreaterThan(HYBRID_CONVERGENCE_CONTAINER_WIDTH);
  });
});

describe("objective formatting", () => {
  it("formats objective values with six decimal places", () => {
    expect(formatObjectiveValue(1)).toBe("1.000000");
    expect(formatObjectiveValue(0.123456789)).toBe("0.123457");
    expect(formatObjectiveValue(0.0000001)).toBe("0.000000");
    expect(formatObjectiveValue(null)).toBe("-");
  });
});

describe("WorkbenchHybridPanel convergence scroll behavior", () => {
  it("renders horizontal scroll container for dense iterations", () => {
    render(
      createElement(WorkbenchHybridPanel, {
        maxIterations: 1000,
        stepSize: 0.2,
        tolerance: 0.001,
        iterationCount: 1000,
        latestObjective: 0.52,
        bestObjective: 0.48,
        latestCurrentBestGap: 0.04,
        canCancel: true,
        iterations: createIterations(1000),
        onMaxIterationsChange: () => undefined,
        onStepSizeChange: () => undefined,
        onToleranceChange: () => undefined,
        onCancel: () => undefined,
      }),
    );

    const scrollContainer = screen.getByTestId("hybrid-convergence-scroll-container");
    const chart = screen.getByTestId("hybrid-convergence-chart");

    expect(scrollContainer).toHaveStyle({ overflowX: "auto" });
    expect(chart).toHaveStyle(`width: ${resolveHybridChartWidth(1000)}px`);
  });
});




