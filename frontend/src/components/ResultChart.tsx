import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

export type ResultChartSortMode = "BASIS" | "PROB_DESC";

interface ResultChartProps {
  readonly probabilities: Record<string, number>;
  readonly title?: string;
  readonly sortMode?: ResultChartSortMode;
  readonly stateLabelFormatter?: (state: string) => string;
  readonly valueDigits?: number;
  readonly showBarValueLabel?: boolean;
  readonly compact?: boolean;
  readonly showTitle?: boolean;
  readonly height?: number;
}

export interface ResultChartEntry {
  readonly state: string;
  readonly probability: number;
  readonly stateLabel: string;
}

export interface BuildResultChartOptionArgs {
  readonly chartData: ResultChartEntry[];
  readonly compact: boolean;
  readonly showTitle: boolean;
  readonly title: string;
  readonly valueDigits: number;
  readonly showBarValueLabel: boolean;
  readonly formatState: (state: string) => string;
}

const DEFAULT_VALUE_DIGITS = 4;
const DEFAULT_CHART_HEIGHT = 360;
const COMPACT_CHART_HEIGHT = 280;

function toGridTop(compact: boolean, showTitle: boolean): number {
  if (!showTitle) {
    return compact ? 12 : 20;
  }
  return compact ? 36 : 50;
}

export function buildResultChartOption({
  chartData,
  compact,
  showTitle,
  title,
  valueDigits,
  showBarValueLabel,
  formatState,
}: BuildResultChartOptionArgs) {
  return {
    title: showTitle
      ? {
          text: title,
          left: "center",
          top: 2,
          textStyle: { fontSize: compact ? 13 : 15, fontWeight: 600 },
        }
      : undefined,
    grid: {
      left: compact ? 34 : 48,
      right: compact ? 10 : 18,
      top: toGridTop(compact, showTitle),
      bottom: compact ? 28 : 48,
      containLabel: true,
    },
    tooltip: {
      trigger: "item",
      formatter: (param: { data?: { state?: string; probability?: number } }) => {
        const state = param.data?.state ?? "";
        const probability = param.data?.probability ?? 0;
        return `${formatState(state)} : ${Number(probability).toFixed(valueDigits)}`;
      },
    },
    xAxis: {
      type: "category",
      data: chartData.map((entry) => entry.stateLabel),
      axisLabel: {
        fontSize: compact ? 11 : 12,
        margin: compact ? 8 : 12,
      },
      axisTick: { alignWithLabel: true },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 1,
      axisLabel: {
        fontSize: compact ? 11 : 12,
      },
      splitLine: {
        lineStyle: {
          color: "#e5e7eb",
        },
      },
    },
    series: [
      {
        type: "bar",
        data: chartData.map((entry) => ({
          value: entry.probability,
          probability: entry.probability,
          state: entry.state,
          stateLabel: entry.stateLabel,
        })),
        itemStyle: { color: "#1677ff" },
        barMaxWidth: compact ? 20 : 26,
        label: {
          show: showBarValueLabel,
          position: "top",
          formatter: (param: { value?: number }) => Number(param.value ?? 0).toFixed(valueDigits),
          fontSize: compact ? 10 : 11,
        },
      },
    ],
  };
}

function ResultChart({
  probabilities,
  title = "量子测量概率分布",
  sortMode = "BASIS",
  stateLabelFormatter,
  valueDigits = DEFAULT_VALUE_DIGITS,
  showBarValueLabel = false,
  compact = false,
  showTitle = true,
  height,
}: ResultChartProps) {
  const formatState = (state: string) => (stateLabelFormatter ? stateLabelFormatter(state) : state);
  const chartHeight = height ?? (compact ? COMPACT_CHART_HEIGHT : DEFAULT_CHART_HEIGHT);

  const chartData = useMemo(() => {
    const entries = Object.entries(probabilities).map(([state, probability]) => ({
      state,
      probability,
    }));

    if (sortMode === "PROB_DESC") {
      entries.sort((left, right) => {
        const probabilityGap = right.probability - left.probability;
        if (probabilityGap !== 0) {
          return probabilityGap;
        }
        return left.state.localeCompare(right.state);
      });
    } else {
      entries.sort((left, right) => left.state.localeCompare(right.state));
    }

    return entries.map((entry) => ({
      ...entry,
      stateLabel: formatState(entry.state),
    }));
  }, [probabilities, sortMode, stateLabelFormatter]);

  const option = buildResultChartOption({
    chartData,
    compact,
    showTitle,
    title,
    valueDigits,
    showBarValueLabel,
    formatState,
  });

  return <ReactECharts option={option} style={{ height: chartHeight }} />;
}

export default ResultChart;
