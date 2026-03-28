import { useEffect, useState } from "react";

import type { BlochVector } from "../simulation/simulation-core";
import type {
  ProbabilityDisplayMode,
  ProbabilityDisplayView,
  ProbabilityFilterResult,
} from "../simulation/probability-filter";
import { toSimulationStateLabel } from "../ui/message-catalog";
import ResultChart, { type ResultChartSortMode } from "../../../components/ResultChart";
import BlochSphere3D from "./BlochSphere3D";
import "./WorkbenchResultPanel.css";

type SimulationViewState = "IDLE" | "RUNNING" | "READY" | "ERROR";

interface WorkbenchResultPanelProps {
  readonly simulationState: SimulationViewState;
  readonly simError: string | null;
  readonly displayMode: ProbabilityDisplayMode;
  readonly epsilonText: string;
  readonly probabilityView: ProbabilityFilterResult | null;
  readonly probabilityDisplayView: ProbabilityDisplayView | null;
  readonly blochVectors: readonly BlochVector[] | null;
  readonly numQubits: number;
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
  blochVectors,
  numQubits,
  onDisplayModeChange,
}: WorkbenchResultPanelProps) {
  const [sortMode, setSortMode] = useState<ResultChartSortMode>(DEFAULT_SORT_MODE);
  const [selectedQubit, setSelectedQubit] = useState(0);
  const availableBlochVectors = blochVectors ?? [];

  useEffect(() => {
    const maxIndex = Math.max(0, Math.min(numQubits, availableBlochVectors.length || numQubits) - 1);
    setSelectedQubit((current) => Math.min(current, maxIndex));
  }, [availableBlochVectors.length, numQubits]);

  const activeBlochVector = availableBlochVectors[selectedQubit] ?? null;
  const showQubitSelector = numQubits > 1;

  return (
    <section className="workbench-result-panel" data-testid="workbench-result-panel">
      <div className="workbench-result-panel__header">
        <div>
          <h3 className="workbench-result-panel__title">测量结果与布洛赫球</h3>
          <p className="workbench-result-panel__status">
            状态：{toSimulationStateLabel(simulationState)} · ε={epsilonText}
          </p>
        </div>
      </div>

      {simError ? <p className="workbench-result-panel__error">{simError}</p> : null}

      <div className="workbench-result-panel__controls">
        <div className="workbench-result-panel__control-group">
          <span className="workbench-result-panel__control-label">显示模式</span>
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
            <input
              type="radio"
              name="displayMode"
              checked={displayMode === "ALL"}
              onChange={() => onDisplayModeChange("ALL")}
            />
            全部
          </label>
        </div>

        <div className="workbench-result-panel__control-group">
          <span className="workbench-result-panel__control-label">排序</span>
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
      </div>

      <div className="workbench-result-panel__layout" data-testid="workbench-result-layout">
        <div className="workbench-result-panel__chart-card">
          {probabilityView && probabilityDisplayView ? (
            probabilityDisplayView.visibleCount > 0 ? (
              <ResultChart
                probabilities={probabilityDisplayView.probabilities}
                title={displayMode === "ALL" ? "全部概率分布" : "过滤后概率分布"}
                sortMode={sortMode}
                stateLabelFormatter={(state) => `|${state}>`}
                valueDigits={3}
                showBarValueLabel
                compact
                height={320}
                showTitle={false}
                adaptiveBarWidth
              />
            ) : (
              <p className="workbench-result-panel__chart-empty">
                当前过滤条件下没有可见概率条目，请调低 epsilon 或切换到“全部”。
              </p>
            )
          ) : (
            <p className="workbench-result-panel__chart-empty">正在准备本地模拟结果...</p>
          )}
        </div>

        <div className="workbench-result-panel__bloch-card" data-testid="workbench-bloch-panel">
          <div className="workbench-result-panel__bloch-header">
            <div>
              <h4 className="workbench-result-panel__bloch-title">单比特布洛赫球</h4>
              <p className="workbench-result-panel__bloch-subtitle">
                展示当前时间步下单个量子比特的 Bloch 向量；纠缠混态会按真实长度落在球内。
              </p>
            </div>

            {showQubitSelector ? (
              <div
                className="workbench-result-panel__bloch-selector"
                data-testid="workbench-bloch-qubit-selector"
              >
                {Array.from({ length: numQubits }, (_value, index) => (
                  <button
                    key={`bloch-qubit-${index}`}
                    type="button"
                    data-active={selectedQubit === index}
                    onClick={() => setSelectedQubit(index)}
                  >
                    q{index}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="workbench-result-panel__bloch-viewport">
            {activeBlochVector ? (
              <BlochSphere3D
                coordinateMode="cartesian"
                x={activeBlochVector.x}
                y={activeBlochVector.y}
                z={activeBlochVector.z}
              />
            ) : (
              <div className="workbench-result-panel__bloch-placeholder">
                正在等待可视化所需的量子态数据...
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default WorkbenchResultPanel;
