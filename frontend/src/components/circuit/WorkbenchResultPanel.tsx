import type {
  ProbabilityDisplayMode,
  ProbabilityDisplayView,
  ProbabilityFilterResult,
} from "../../features/circuit/simulation/probability-filter";
import { toSimulationStateLabel } from "../../features/circuit/ui/message-catalog";
import ResultChart from "../ResultChart";

type SimulationViewState = "IDLE" | "RUNNING" | "READY" | "ERROR";

interface WorkbenchResultPanelProps {
  readonly simulationState: SimulationViewState;
  readonly simError: string | null;
  readonly displayMode: ProbabilityDisplayMode;
  readonly epsilonText: string;
  readonly probabilityView: ProbabilityFilterResult | null;
  readonly probabilityDisplayView: ProbabilityDisplayView | null;
  readonly onDisplayModeChange: (mode: ProbabilityDisplayMode) => void;
}

function WorkbenchResultPanel({
  simulationState,
  simError,
  displayMode,
  epsilonText,
  probabilityView,
  probabilityDisplayView,
  onDisplayModeChange,
}: WorkbenchResultPanelProps) {
  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }} data-testid="workbench-result-panel">
      <h3 style={{ marginTop: 0 }}>本地模拟结果</h3>
      <p style={{ margin: "0 0 8px 0", color: "#666" }}>
        状态：{toSimulationStateLabel(simulationState)}
      </p>
      {simError ? <p style={{ color: "#cf1322" }}>{simError}</p> : null}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <span>显示模式:</span>
        <label>
          <input
            type="radio"
            name="displayMode"
            checked={displayMode === "FILTERED"}
            onChange={() => onDisplayModeChange("FILTERED")}
          />
          仅显示过滤后
        </label>
        <label>
          <input
            type="radio"
            name="displayMode"
            checked={displayMode === "ALL"}
            onChange={() => onDisplayModeChange("ALL")}
          />
          显示全部状态
        </label>
      </div>

      <p style={{ margin: "0 0 8px 0", color: "#666" }}>
        过滤阈值: epsilon = 2^-(n+2) = {epsilonText}
      </p>

      {probabilityView && probabilityDisplayView ? (
        <>
          <p style={{ margin: "0 0 8px 0", color: "#666" }}>
            总状态数: {probabilityView.totalCount} | 可见: {probabilityDisplayView.visibleCount} | 隐藏:{" "}
            {probabilityDisplayView.hiddenCount} | 概率和: {probabilityView.probabilitySum.toFixed(6)}
          </p>
          {probabilityDisplayView.visibleCount > 0 ? (
            <ResultChart
              probabilities={probabilityDisplayView.probabilities}
              title={displayMode === "ALL" ? "全状态概率分布" : "过滤后概率分布"}
            />
          ) : (
            <p style={{ color: "#999" }}>当前模式下无可展示状态。</p>
          )}
        </>
      ) : (
        <p style={{ color: "#999" }}>正在计算本地模拟结果...</p>
      )}
    </section>
  );
}

export default WorkbenchResultPanel;
