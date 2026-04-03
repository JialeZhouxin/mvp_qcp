import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

import { useTasksTheme } from "../../../theme/AppTheme";
import type { HybridIterationPoint } from "../submission/use-workbench-hybrid-submit";
import {
  buildHybridConvergenceOption,
  formatObjectiveValue,
  resolveHybridChartWidth,
} from "./hybrid-convergence-chart";

interface WorkbenchHybridPanelProps {
  readonly maxIterations: number;
  readonly stepSize: number;
  readonly tolerance: number;
  readonly iterationCount: number;
  readonly latestObjective: number | null;
  readonly bestObjective: number | null;
  readonly latestCurrentBestGap: number | null;
  readonly canCancel: boolean;
  readonly iterations: readonly HybridIterationPoint[];
  readonly onMaxIterationsChange: (value: number) => void;
  readonly onStepSizeChange: (value: number) => void;
  readonly onToleranceChange: (value: number) => void;
  readonly onCancel: () => void;
}

const HYBRID_CHART_HEIGHT = 220;

function WorkbenchHybridPanel({
  maxIterations,
  stepSize,
  tolerance,
  iterationCount,
  latestObjective,
  bestObjective,
  latestCurrentBestGap,
  canCancel,
  iterations,
  onMaxIterationsChange,
  onStepSizeChange,
  onToleranceChange,
  onCancel,
}: WorkbenchHybridPanelProps) {
  const { mode: tasksThemeMode, palette: tasksPalette } = useTasksTheme();

  const chartPoints = useMemo(
    () => iterations.map((item) => ({ iteration: item.iteration, objective: item.objective })),
    [iterations],
  );
  const chartWidth = useMemo(() => resolveHybridChartWidth(chartPoints.length), [chartPoints.length]);
  const chartOption = useMemo(
    () =>
      buildHybridConvergenceOption({
        points: chartPoints,
        palette: {
          textColor: tasksPalette.textPrimary,
          axisColor: tasksPalette.chartAxis,
          splitLineColor: tasksPalette.chartGrid,
          axisLineColor: tasksPalette.borderStrong,
          lineColor: tasksPalette.accentPrimary,
          tooltipBackground:
            tasksThemeMode === "light" ? "rgba(255, 255, 255, 0.96)" : "rgba(8, 15, 28, 0.96)",
          tooltipBorder: tasksPalette.borderStrong,
        },
      }),
    [chartPoints, tasksPalette, tasksThemeMode],
  );

  return (
    <section
      data-testid="workbench-hybrid-panel"
      style={{
        marginTop: 10,
        border: "1px solid var(--border-subtle)",
        borderRadius: 12,
        padding: 12,
        background: "color-mix(in srgb, var(--surface-panel) 90%, var(--accent-info))",
        overflowX: "hidden",
      }}
    >
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
        <label>
          最大迭代
          <input
            data-testid="hybrid-max-iterations-input"
            type="number"
            min={1}
            max={10000}
            value={maxIterations}
            onChange={(event) => onMaxIterationsChange(Number(event.target.value))}
            style={{ marginLeft: 8, width: 96 }}
          />
        </label>
        <label>
          步长
          <input
            data-testid="hybrid-step-size-input"
            type="number"
            min={0.0001}
            step={0.01}
            value={stepSize}
            onChange={(event) => onStepSizeChange(Number(event.target.value))}
            style={{ marginLeft: 8, width: 96 }}
          />
        </label>
        <label>
          收敛阈值
          <input
            data-testid="hybrid-tolerance-input"
            type="number"
            min={0.000001}
            step={0.0001}
            value={tolerance}
            onChange={(event) => onToleranceChange(Number(event.target.value))}
            style={{ marginLeft: 8, width: 120 }}
          />
        </label>
        <button type="button" disabled={!canCancel} onClick={onCancel}>
          取消实验
        </button>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>当前目标值: {formatObjectiveValue(latestObjective)}</span>
        <span>历史最优值: {formatObjectiveValue(bestObjective)}</span>
        <span>迭代次数: {iterationCount}</span>
        <span>current-best 差值: {formatObjectiveValue(latestCurrentBestGap)}</span>
      </div>

      <h4 style={{ margin: "10px 0 6px 0", fontSize: 14 }}>收敛轨迹（运行中）</h4>
      <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 8, padding: 8 }}>
        {iterations.length > 1 ? (
          <div
            data-testid="hybrid-convergence-scroll-container"
            style={{ width: "100%", overflowX: "auto", overflowY: "hidden" }}
          >
            <div
              data-testid="hybrid-convergence-chart"
              style={{ width: chartWidth, minWidth: "100%" }}
            >
              <ReactECharts option={chartOption} style={{ width: chartWidth, height: HYBRID_CHART_HEIGHT }} />
            </div>
          </div>
        ) : (
          <p
            data-testid="hybrid-convergence-empty"
            style={{ margin: 0, color: "var(--text-muted)" }}
          >
            提交后将展示每轮目标值变化。
          </p>
        )}
      </div>
    </section>
  );
}

export default WorkbenchHybridPanel;
