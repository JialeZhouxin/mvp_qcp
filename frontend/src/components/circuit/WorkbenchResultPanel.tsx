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
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }} data-testid="workbench-result-panel">
      <h3 style={{ margin: "0 0 6px 0", fontSize: 16 }}>测量直方图</h3>
      <p style={{ margin: "0 0 6px 0", color: "#666", fontSize: 13 }}>
        状态：{toSimulationStateLabel(simulationState)} · ε={epsilonText}
      </p>
      {simError ? <p style={{ margin: "0 0 6px 0", color: "#cf1322" }}>{simError}</p> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 6, fontSize: 13 }}>
        <span>显示</span>
        <label>
          <input
            type="radio"
            name="displayMode"
            checked={displayMode === "FILTERED"}
            onChange={() => onDisplayModeChange("FILTERED")}
          />
          过滤后
        </label>
        <label>
          <input type="radio" name="displayMode" checked={displayMode === "ALL"} onChange={() => onDisplayModeChange("ALL")} />
          全部
        </label>

        <span>排序</span>
        <label>
          <input
            type="radio"
            name="probabilitySortMode"
            data-testid="sort-mode-basis"
            checked={sortMode === "BASIS"}
            onChange={() => setSortMode("BASIS")}
          />
          基态序
        </label>
        <label>
          <input
            type="radio"
            name="probabilitySortMode"
            data-testid="sort-mode-prob-desc"
            checked={sortMode === "PROB_DESC"}
            onChange={() => setSortMode("PROB_DESC")}
          />
          概率序
        </label>
      </div>

      {probabilityView && probabilityDisplayView ? (
        probabilityDisplayView.visibleCount > 0 ? (
          <ResultChart
            probabilities={probabilityDisplayView.probabilities}
            title={displayMode === "ALL" ? "全部状态" : "过滤后状态"}
            sortMode={sortMode}
            stateLabelFormatter={(state) => `|${state}>`}
            valueDigits={3}
            showBarValueLabel
            compact
            height={280}
            showTitle={false}
          />
        ) : (
          <p style={{ margin: 0, color: "#999" }}>当前模式无可见状态，切换到“全部”可查看完整分布。</p>
        )
      ) : (
        <p style={{ margin: 0, color: "#999" }}>等待仿真结果...</p>
      )}
    </section>
  );
}

export default WorkbenchResultPanel;
