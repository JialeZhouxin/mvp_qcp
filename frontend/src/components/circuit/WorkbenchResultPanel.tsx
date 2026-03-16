import { useState } from "react";

import type {
  ProbabilityDisplayMode,
  ProbabilityDisplayView,
  ProbabilityFilterResult,
} from "../../features/circuit/simulation/probability-filter";
import { toSimulationStateLabel } from "../../features/circuit/ui/message-catalog";
import ResultChart, { type ResultChartSortMode } from "../ResultChart";

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

const DEFAULT_SORT_MODE: ResultChartSortMode = "BASIS";

function WorkbenchResultPanel({
  simulationState,
  simError,
  displayMode,
  epsilonText,
  probabilityView,
  probabilityDisplayView,
  onDisplayModeChange,
}: WorkbenchResultPanelProps) {
  const [sortMode, setSortMode] = useState<ResultChartSortMode>(DEFAULT_SORT_MODE);

  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }} data-testid="workbench-result-panel">
      <h3 style={{ marginTop: 0 }}>概率分布</h3>
      <p style={{ margin: "0 0 8px 0", color: "#666" }}>模拟状态：{toSimulationStateLabel(simulationState)}</p>
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
          过滤后状态
        </label>
        <label>
          <input
            type="radio"
            name="displayMode"
            checked={displayMode === "ALL"}
            onChange={() => onDisplayModeChange("ALL")}
          />
          全部状态
        </label>
      </div>

      <p style={{ margin: "0 0 8px 0", color: "#666" }}>过滤阈值 epsilon = 2^-(n+2) = {epsilonText}</p>

      {probabilityView && probabilityDisplayView ? (
        <>
          <p style={{ margin: "0 0 8px 0", color: "#666" }}>
            总状态数: {probabilityView.totalCount} | 可见: {probabilityDisplayView.visibleCount} | 隐藏: {" "}
            {probabilityDisplayView.hiddenCount} | 概率和: {probabilityView.probabilitySum.toFixed(6)}
          </p>

          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
            <span>排序:</span>
            <label>
              <input
                type="radio"
                name="probabilitySortMode"
                data-testid="sort-mode-basis"
                checked={sortMode === "BASIS"}
                onChange={() => setSortMode("BASIS")}
              />
              基态顺序
            </label>
            <label>
              <input
                type="radio"
                name="probabilitySortMode"
                data-testid="sort-mode-prob-desc"
                checked={sortMode === "PROB_DESC"}
                onChange={() => setSortMode("PROB_DESC")}
              />
              概率降序
            </label>
          </div>

          {probabilityDisplayView.visibleCount > 0 ? (
            <ResultChart
              probabilities={probabilityDisplayView.probabilities}
              title={displayMode === "ALL" ? "全状态概率分布" : "过滤后概率分布"}
              sortMode={sortMode}
              stateLabelFormatter={(state) => `|${state}>`}
              valueDigits={3}
              showBarValueLabel
            />
          ) : (
            <p style={{ color: "#999" }}>当前显示模式下无可见状态，请切换到“全部状态”查看完整分布。</p>
          )}
        </>
      ) : (
        <p style={{ color: "#999" }}>等待模拟结果...</p>
      )}
    </section>
  );
}

export default WorkbenchResultPanel;
