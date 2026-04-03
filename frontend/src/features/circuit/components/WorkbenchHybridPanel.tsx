import type { HybridIterationPoint } from "../submission/use-workbench-hybrid-submit";

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

function buildSparklinePoints(iterations: readonly HybridIterationPoint[]): string {
  if (iterations.length === 0) {
    return "";
  }
  const width = 240;
  const height = 64;
  const values = iterations.map((item) => item.objective);
  const minObjective = Math.min(...values);
  const maxObjective = Math.max(...values);
  const objectiveSpan = maxObjective - minObjective || 1;

  const minIteration = Math.min(...iterations.map((item) => item.iteration));
  const maxIteration = Math.max(...iterations.map((item) => item.iteration));
  const iterationSpan = maxIteration - minIteration || 1;

  return iterations
    .map((item) => {
      const x = ((item.iteration - minIteration) / iterationSpan) * width;
      const y = height - ((item.objective - minObjective) / objectiveSpan) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

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
  const points = buildSparklinePoints(iterations);

  return (
    <section
      data-testid="workbench-hybrid-panel"
      style={{
        marginTop: 10,
        border: "1px solid var(--border-subtle)",
        borderRadius: 12,
        padding: 12,
        background: "color-mix(in srgb, var(--surface-panel) 90%, var(--accent-info))",
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
        <span>当前目标值: {latestObjective ?? "-"}</span>
        <span>历史最优值: {bestObjective ?? "-"}</span>
        <span>迭代次数: {iterationCount}</span>
        <span>current-best 差值: {latestCurrentBestGap ?? "-"}</span>
      </div>

      <h4 style={{ margin: "10px 0 6px 0", fontSize: 14 }}>收敛轨迹（运行中）</h4>
      <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 8, padding: 8 }}>
        {iterations.length > 1 ? (
          <svg width={240} height={64} role="img" aria-label="hybrid-convergence-sparkline">
            <polyline fill="none" stroke="var(--accent-info)" strokeWidth={2} points={points} />
          </svg>
        ) : (
          <p style={{ margin: 0, color: "var(--text-muted)" }}>提交后将展示每轮目标值变化。</p>
        )}
      </div>
    </section>
  );
}

export default WorkbenchHybridPanel;
