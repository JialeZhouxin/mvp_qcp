import type { EChartsOption } from "echarts";

export interface HybridConvergencePoint {
  readonly iteration: number;
  readonly objective: number;
}

export interface HybridConvergencePalette {
  readonly textColor: string;
  readonly axisColor: string;
  readonly splitLineColor: string;
  readonly axisLineColor: string;
  readonly lineColor: string;
  readonly tooltipBackground: string;
  readonly tooltipBorder: string;
}

export interface BuildHybridConvergenceOptionArgs {
  readonly points: readonly HybridConvergencePoint[];
  readonly palette: HybridConvergencePalette;
}

export const HYBRID_CHART_MIN_WIDTH = 320;
export const HYBRID_CHART_PX_PER_POINT = 6;
export const HYBRID_CHART_MAX_WIDTH = 12000;
export const HYBRID_CONVERGENCE_CONTAINER_WIDTH = 960;
export const HYBRID_OBJECTIVE_DECIMAL_PLACES = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveHybridChartWidth(pointCount: number): number {
  const sanitizedPointCount = Number.isFinite(pointCount) ? Math.max(0, pointCount) : 0;
  return clamp(
    sanitizedPointCount * HYBRID_CHART_PX_PER_POINT,
    HYBRID_CHART_MIN_WIDTH,
    HYBRID_CHART_MAX_WIDTH,
  );
}

export function formatObjectiveValue(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return "-";
  }
  return value.toFixed(HYBRID_OBJECTIVE_DECIMAL_PLACES);
}

export function buildHybridConvergenceOption({
  points,
  palette,
}: BuildHybridConvergenceOptionArgs): EChartsOption {
  const seriesData: Array<[number, number]> = points.map((item) => [item.iteration, item.objective]);

  return {
    animation: false,
    grid: {
      left: 52,
      right: 24,
      top: 36,
      bottom: 40,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: palette.tooltipBackground,
      borderColor: palette.tooltipBorder,
      textStyle: {
        color: palette.textColor,
      },
      formatter: (rawParam: unknown): string => {
        const params = Array.isArray(rawParam) ? rawParam : [rawParam];
        const first = params[0] as
          | {
              readonly data?: [number, number] | number[];
            }
          | undefined;
        const iteration = first?.data?.[0];
        const objective = first?.data?.[1];

        return `迭代 ${iteration ?? "-"}<br/>代价函数 ${formatObjectiveValue(objective)}`;
      },
    },
    xAxis: {
      type: "value",
      name: "迭代次数",
      nameLocation: "middle",
      nameGap: 26,
      minInterval: 1,
      axisLabel: {
        color: palette.axisColor,
      },
      axisLine: {
        lineStyle: {
          color: palette.axisLineColor,
        },
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: "value",
      name: "代价函数",
      nameLocation: "middle",
      nameGap: 44,
      axisLabel: {
        color: palette.axisColor,
        formatter: (rawValue: number | string) => {
          const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
          if (!Number.isFinite(value)) {
            return "-";
          }
          return value.toFixed(HYBRID_OBJECTIVE_DECIMAL_PLACES);
        },
      },
      axisLine: {
        lineStyle: {
          color: palette.axisLineColor,
        },
      },
      splitLine: {
        lineStyle: {
          color: palette.splitLineColor,
        },
      },
    },
    series: [
      {
        type: "line",
        smooth: false,
        showSymbol: false,
        lineStyle: {
          width: 2,
          color: palette.lineColor,
        },
        data: seriesData,
      },
    ],
  };
}

