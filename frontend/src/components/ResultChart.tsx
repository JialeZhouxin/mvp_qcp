import ReactECharts from "echarts-for-react";

interface ResultChartProps {
  probabilities: Record<string, number>;
}

function ResultChart({ probabilities }: ResultChartProps) {
  const labels = Object.keys(probabilities);
  const values = labels.map((k) => probabilities[k]);

  const option = {
    title: { text: "量子测量概率分布" },
    tooltip: {
      trigger: "axis",
      formatter: (params: Array<{ axisValue: string; value: number }>) => {
        const item = params?.[0];
        if (!item) return "";
        return `${item.axisValue}: ${(item.value ?? 0).toFixed(4)}`;
      },
    },
    xAxis: { type: "category", data: labels },
    yAxis: { type: "value", min: 0, max: 1 },
    series: [
      {
        type: "bar",
        data: values,
        itemStyle: { color: "#1677ff" },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 360 }} />;
}

export default ResultChart;
