import { useEffect, useRef, useState } from "react";

import CircuitCanvas from "../components/circuit/CircuitCanvas";
import GatePalette from "../components/circuit/GatePalette";
import QasmEditorPane from "../components/circuit/QasmEditorPane";
import QasmErrorPanel from "../components/circuit/QasmErrorPanel";
import ResultChart from "../components/ResultChart";
import { evaluateComplexity } from "../features/circuit/model/complexity-guard";
import type { CircuitModel } from "../features/circuit/model/types";
import { filterProbabilities, type ProbabilityFilterResult } from "../features/circuit/simulation/probability-filter";
import {
  SimulationScheduleError,
  createSimulationScheduler,
} from "../features/circuit/simulation/scheduler";
import { toQasm3 } from "../features/circuit/qasm/qasm-bridge";
import type { QasmParseError } from "../features/circuit/qasm/qasm-errors";

const INITIAL_CIRCUIT: CircuitModel = {
  numQubits: 2,
  operations: [
    { id: "init-1", gate: "h", targets: [0], layer: 0 },
    { id: "init-2", gate: "cx", controls: [0], targets: [1], layer: 1 },
    { id: "init-3", gate: "m", targets: [0], layer: 2 },
    { id: "init-4", gate: "m", targets: [1], layer: 3 },
  ],
};

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

function CircuitWorkbenchPage({ scheduler }: CircuitWorkbenchPageProps) {
  const [circuit, setCircuit] = useState<CircuitModel>(INITIAL_CIRCUIT);
  const [qasm, setQasm] = useState(() => toQasm3(INITIAL_CIRCUIT));
  const [parseError, setParseError] = useState<QasmParseError | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [probabilityView, setProbabilityView] = useState<ProbabilityFilterResult | null>(null);
  const schedulerRef = useRef<SimulationSchedulerLike>(scheduler ?? createSimulationScheduler());

  const runSimulation = async (model: CircuitModel) => {
    const complexity = evaluateComplexity(model);
    if (!complexity.ok) {
      setSimError(formatComplexityMessage(complexity.message));
      return;
    }

    try {
      const response = await schedulerRef.current.schedule(model);
      const filtered = filterProbabilities(model.numQubits, response.probabilities);
      setProbabilityView(filtered);
      setSimError(null);
    } catch (error) {
      if (error instanceof SimulationScheduleError && error.code === "SIM_STALE") {
        return;
      }
      setSimError(error instanceof Error ? error.message : String(error));
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
          左侧拖拽电路，右侧编辑 OpenQASM 3，编辑后自动本地仿真并更新概率直方图。
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
        {simError ? <p style={{ color: "#cf1322" }}>{simError}</p> : null}
        {probabilityView ? (
          <>
            <p style={{ margin: "0 0 8px 0", color: "#666" }}>
              总态数: {probabilityView.totalCount} | 已渲染: {probabilityView.visibleCount} |
              已隐藏: {probabilityView.hiddenCount} | 概率和: {probabilityView.probabilitySum.toFixed(6)}
            </p>
            {probabilityView.visibleCount > 0 ? (
              <ResultChart probabilities={probabilityView.visible} title="过滤后基态概率分布" />
            ) : (
              <p style={{ color: "#999" }}>当前阈值下无可见态。</p>
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
