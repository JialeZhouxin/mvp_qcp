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
}

const DEFAULT_VALUE_DIGITS = 4;

function ResultChart({
  probabilities,
  title = "量子测量概率分布",
  sortMode = "BASIS",
  stateLabelFormatter,
  valueDigits = DEFAULT_VALUE_DIGITS,
  showBarValueLabel = false,
}: ResultChartProps) {
  const formatState = (state: string) => (stateLabelFormatter ? stateLabelFormatter(state) : state);

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

  const option = {
    title: { text: title },
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
    },
    yAxis: { type: "value", min: 0, max: 1 },
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
        label: {
          show: showBarValueLabel,
          position: "top",
          formatter: (param: { value?: number }) => Number(param.value ?? 0).toFixed(valueDigits),
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 360 }} />;
}

export default ResultChart;
