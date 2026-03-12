import { useEffect, useRef, useState } from "react";

import CircuitCanvas from "../components/circuit/CircuitCanvas";
import GatePalette from "../components/circuit/GatePalette";
import QasmEditorPane from "../components/circuit/QasmEditorPane";
import QasmErrorPanel from "../components/circuit/QasmErrorPanel";
import ResultChart from "../components/ResultChart";
import { validateCircuitModel } from "../features/circuit/model/circuit-validation";
import { evaluateComplexity } from "../features/circuit/model/complexity-guard";
import type { CircuitModel } from "../features/circuit/model/types";
import { toQasm3 } from "../features/circuit/qasm/qasm-bridge";
import type { QasmParseError } from "../features/circuit/qasm/qasm-errors";
import {
  filterProbabilities,
  type ProbabilityFilterResult,
} from "../features/circuit/simulation/probability-filter";
import {
  SimulationScheduleError,
  createSimulationScheduler,
} from "../features/circuit/simulation/scheduler";

const INITIAL_CIRCUIT: CircuitModel = {
  numQubits: 2,
  operations: [
    { id: "init-1", gate: "h", targets: [0], layer: 0 },
    { id: "init-2", gate: "cx", controls: [0], targets: [1], layer: 1 },
    { id: "init-3", gate: "m", targets: [0], layer: 2 },
    { id: "init-4", gate: "m", targets: [1], layer: 3 },
  ],
};

type SimulationViewState = "IDLE" | "RUNNING" | "READY" | "ERROR";

interface SimulationSchedulerLike {
  readonly schedule: (
    model: CircuitModel,
  ) => Promise<{ requestId: string; probabilities: Record<string, number> }>;
}

interface CircuitWorkbenchPageProps {
  readonly scheduler?: SimulationSchedulerLike;
}

function formatComplexityMessage(message: string | undefined): string {
  if (!message) {
    return "circuit exceeds complexity limits";
  }
  return message;
}

function normalizeCircuitQasm(model: CircuitModel): string {
  return toQasm3(model).trim();
}

function formatSimulationState(state: SimulationViewState): string {
  if (state === "RUNNING") {
    return "仿真中...";
  }
  if (state === "READY") {
    return "结果已更新";
  }
  if (state === "ERROR") {
    return "仿真失败";
  }
  return "等待仿真";
}

function CircuitWorkbenchPage({ scheduler }: CircuitWorkbenchPageProps) {
  const [circuit, setCircuit] = useState<CircuitModel>(INITIAL_CIRCUIT);
  const [qasm, setQasm] = useState(() => toQasm3(INITIAL_CIRCUIT));
  const [parseError, setParseError] = useState<QasmParseError | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simulationState, setSimulationState] = useState<SimulationViewState>("IDLE");
  const [probabilityView, setProbabilityView] = useState<ProbabilityFilterResult | null>(null);
  const schedulerRef = useRef<SimulationSchedulerLike>(scheduler ?? createSimulationScheduler());

  const runSimulation = async (model: CircuitModel) => {
    setSimulationState("RUNNING");

    const validation = validateCircuitModel(model);
    if (!validation.ok) {
      setSimError(validation.error.message);
      setProbabilityView(null);
      setSimulationState("ERROR");
      return;
    }

    const complexity = evaluateComplexity(model);
    if (!complexity.ok) {
      setSimError(formatComplexityMessage(complexity.message));
      setProbabilityView(null);
      setSimulationState("ERROR");
      return;
    }

    try {
      const response = await schedulerRef.current.schedule(model);
      const filtered = filterProbabilities(model.numQubits, response.probabilities);
      setProbabilityView(filtered);
      setSimError(null);
      setSimulationState("READY");
    } catch (error) {
      if (error instanceof SimulationScheduleError && error.code === "SIM_STALE") {
        return;
      }
      setSimError(error instanceof Error ? error.message : String(error));
      setSimulationState("ERROR");
    }
  };

  useEffect(() => {
    void runSimulation(INITIAL_CIRCUIT);
  }, []);

  const onCircuitChange = (next: CircuitModel) => {
    setCircuit(next);
    setQasm(toQasm3(next));
    setParseError(null);
    void runSimulation(next);
  };

  const onValidQasmChange = (nextModel: CircuitModel) => {
    if (normalizeCircuitQasm(nextModel) === normalizeCircuitQasm(circuit)) {
      return;
    }
    setCircuit(nextModel);
    setQasm(toQasm3(nextModel));
    void runSimulation(nextModel);
  };

  return (
    <main style={{ maxWidth: 1320, margin: "24px auto", display: "grid", gap: 16 }}>
      <header>
        <h1 style={{ marginBottom: 8 }}>图形化量子工作台</h1>
        <p style={{ margin: 0, color: "#666" }}>
          左侧拖拽量子门构建线路，右侧可编辑 OpenQASM 3，变更后会自动本地仿真并更新概率图。
        </p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <GatePalette />
          <CircuitCanvas circuit={circuit} onCircuitChange={onCircuitChange} />
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <QasmEditorPane
            value={qasm}
            onValueChange={setQasm}
            onValidQasmChange={onValidQasmChange}
            onParseError={setParseError}
          />
          <QasmErrorPanel error={parseError} />
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>测量概率直方图</h3>
        <p style={{ margin: "0 0 8px 0", color: "#666" }}>状态: {formatSimulationState(simulationState)}</p>
        {simError ? <p style={{ color: "#cf1322" }}>{simError}</p> : null}
        {probabilityView ? (
          <>
            <p style={{ margin: "0 0 8px 0", color: "#666" }}>
              总状态数: {probabilityView.totalCount} | 可见: {probabilityView.visibleCount} | 隐藏:{" "}
              {probabilityView.hiddenCount} | 概率和: {probabilityView.probabilitySum.toFixed(6)}
            </p>
            {probabilityView.visibleCount > 0 ? (
              <ResultChart probabilities={probabilityView.visible} title="过滤后的基态概率分布" />
            ) : (
              <p style={{ color: "#999" }}>当前阈值下没有可展示的基态。</p>
            )}
          </>
        ) : (
          <p style={{ color: "#999" }}>等待仿真结果...</p>
        )}
      </section>
    </main>
  );
}

export default CircuitWorkbenchPage;
