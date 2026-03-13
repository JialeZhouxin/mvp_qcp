import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import CircuitCanvas from "../components/circuit/CircuitCanvas";
import GatePalette from "../components/circuit/GatePalette";
import QasmEditorPane from "../components/circuit/QasmEditorPane";
import QasmErrorPanel from "../components/circuit/QasmErrorPanel";
import WorkbenchGuide from "../components/circuit/WorkbenchGuide";
import WorkbenchResultPanel from "../components/circuit/WorkbenchResultPanel";
import WorkbenchToolbar from "../components/circuit/WorkbenchToolbar";
import {
  canRedoHistory,
  canUndoHistory,
  createHistoryState,
  pushHistoryState,
  redoHistoryState,
  undoHistoryState,
  type EditorHistoryState,
} from "../features/circuit/model/history";
import {
  listCircuitTemplates,
  loadCircuitTemplate,
} from "../features/circuit/model/templates";
import type { CircuitModel } from "../features/circuit/model/types";
import { evaluateComplexity } from "../features/circuit/model/complexity-guard";
import { validateCircuitModel } from "../features/circuit/model/circuit-validation";
import { toQasm3 } from "../features/circuit/qasm/qasm-bridge";
import type { QasmParseError } from "../features/circuit/qasm/qasm-errors";
import {
  filterProbabilities,
  getProbabilityDisplayView,
  type ProbabilityDisplayMode,
  type ProbabilityFilterResult,
} from "../features/circuit/simulation/probability-filter";
import {
  SimulationScheduleError,
  createSimulationScheduler,
} from "../features/circuit/simulation/scheduler";
import {
  clearWorkbenchDraft,
  loadWorkbenchDraft,
  saveWorkbenchDraft,
} from "../features/circuit/ui/draft-storage";
import {
  isWorkbenchGuideDismissed,
  setWorkbenchGuideDismissed,
} from "../features/circuit/ui/guide-preference";

const DEFAULT_TEMPLATE_ID = "bell";
const DEFAULT_DISPLAY_MODE: ProbabilityDisplayMode = "FILTERED";

type SimulationViewState = "IDLE" | "RUNNING" | "READY" | "ERROR";

interface SimulationSchedulerLike {
  readonly schedule: (
    model: CircuitModel,
  ) => Promise<{ requestId: string; probabilities: Record<string, number> }>;
}

interface CircuitWorkbenchPageProps {
  readonly scheduler?: SimulationSchedulerLike;
}

interface InitialWorkbenchState {
  readonly circuit: CircuitModel;
  readonly qasm: string;
  readonly displayMode: ProbabilityDisplayMode;
}

function createDefaultCircuit(): CircuitModel {
  return loadCircuitTemplate(DEFAULT_TEMPLATE_ID);
}

function buildInitialState(): InitialWorkbenchState {
  const defaultCircuit = createDefaultCircuit();
  const defaultQasm = toQasm3(defaultCircuit);
  const draft = loadWorkbenchDraft();
  if (!draft) {
    return {
      circuit: defaultCircuit,
      qasm: defaultQasm,
      displayMode: DEFAULT_DISPLAY_MODE,
    };
  }
  return {
    circuit: draft.circuit,
    qasm: draft.qasm,
    displayMode: draft.displayMode,
  };
}

function areCircuitsEquivalent(left: CircuitModel, right: CircuitModel): boolean {
  return toQasm3(left).trim() === toQasm3(right).trim();
}

function formatComplexityMessage(message: string | undefined): string {
  if (!message) {
    return "线路复杂度超过限制。";
  }
  return `线路复杂度超过限制：${message}`;
}

function createNextHistoryState(
  previous: EditorHistoryState<CircuitModel>,
  next: CircuitModel,
): EditorHistoryState<CircuitModel> {
  return pushHistoryState(previous, next, { equals: areCircuitsEquivalent });
}

function CircuitWorkbenchPage({ scheduler }: CircuitWorkbenchPageProps) {
  const [initialState] = useState(buildInitialState);
  const [history, setHistory] = useState<EditorHistoryState<CircuitModel>>(() =>
    createHistoryState(initialState.circuit),
  );
  const [qasm, setQasm] = useState(() => initialState.qasm);
  const [displayMode, setDisplayMode] = useState<ProbabilityDisplayMode>(
    initialState.displayMode,
  );
  const [parseError, setParseError] = useState<QasmParseError | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simulationState, setSimulationState] =
    useState<SimulationViewState>("IDLE");
  const [probabilityView, setProbabilityView] =
    useState<ProbabilityFilterResult | null>(null);
  const [showGuide, setShowGuide] = useState(() => !isWorkbenchGuideDismissed());
  const schedulerRef = useRef<SimulationSchedulerLike>(
    scheduler ?? createSimulationScheduler(),
  );

  const circuit = history.present;
  const templates = listCircuitTemplates();

  const runSimulation = async (model: CircuitModel) => {
    setSimulationState("RUNNING");

    const validation = validateCircuitModel(model);
    if (!validation.ok) {
      setSimError(`线路校验失败：${validation.error.message}`);
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
      setSimError(`仿真失败：${error instanceof Error ? error.message : String(error)}`);
      setSimulationState("ERROR");
    }
  };

  useEffect(() => {
    void runSimulation(circuit);
  }, [circuit]);

  useEffect(() => {
    const normalized = toQasm3(circuit);
    setQasm((previous) => (previous === normalized ? previous : normalized));
    setParseError(null);
  }, [circuit]);

  useEffect(() => {
    saveWorkbenchDraft({
      version: 1,
      circuit,
      qasm: toQasm3(circuit),
      displayMode,
      updatedAt: Date.now(),
    });
  }, [circuit, displayMode]);

  const pushCircuit = (next: CircuitModel) => {
    setHistory((previous) => createNextHistoryState(previous, next));
  };

  const onCircuitChange = (next: CircuitModel) => {
    pushCircuit(next);
  };

  const onValidQasmChange = (nextModel: CircuitModel) => {
    if (areCircuitsEquivalent(nextModel, circuit)) {
      return;
    }
    pushCircuit(nextModel);
  };

  const onUndo = () => {
    setHistory((previous) => undoHistoryState(previous));
  };

  const onRedo = () => {
    setHistory((previous) => redoHistoryState(previous));
  };

  const onClearCircuit = () => {
    pushCircuit({
      numQubits: circuit.numQubits,
      operations: [],
    });
  };

  const onLoadTemplate = (templateId: string) => {
    const next = loadCircuitTemplate(templateId);
    pushCircuit(next);
  };

  const onResetWorkbench = () => {
    const fallback = createDefaultCircuit();
    setHistory(createHistoryState(fallback));
    setQasm(toQasm3(fallback));
    setDisplayMode(DEFAULT_DISPLAY_MODE);
    setParseError(null);
    clearWorkbenchDraft();
  };

  const onDismissGuide = () => {
    setShowGuide(false);
    setWorkbenchGuideDismissed(true);
  };

  const onDisplayModeChange = (mode: ProbabilityDisplayMode) => {
    setDisplayMode(mode);
  };

  const probabilityDisplayView = probabilityView
    ? getProbabilityDisplayView(displayMode, probabilityView)
    : null;

  const epsilonText = probabilityView ? probabilityView.epsilon.toExponential(3) : "--";

  return (
    <main style={{ maxWidth: 1320, margin: "24px auto", display: "grid", gap: 16 }}>
      <header>
        <h1 style={{ marginBottom: 8 }}>图形化量子工作台</h1>
        <p style={{ margin: 0, color: "#666" }}>
          左侧拖拽量子门构建线路，右侧可编辑 OpenQASM 3，变更后自动本地仿真并更新概率图。
        </p>
        <p style={{ margin: "8px 0 0 0" }}>
          <Link to="/tasks/code">切换到代码提交模式</Link>
        </p>
      </header>

      <WorkbenchGuide visible={showGuide} onDismiss={onDismissGuide} />
      <WorkbenchToolbar
        canUndo={canUndoHistory(history)}
        canRedo={canRedoHistory(history)}
        templates={templates}
        onUndo={onUndo}
        onRedo={onRedo}
        onClearCircuit={onClearCircuit}
        onResetWorkbench={onResetWorkbench}
        onLoadTemplate={onLoadTemplate}
      />

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

      <WorkbenchResultPanel
        simulationState={simulationState}
        simError={simError}
        displayMode={displayMode}
        epsilonText={epsilonText}
        probabilityView={probabilityView}
        probabilityDisplayView={probabilityDisplayView}
        onDisplayModeChange={onDisplayModeChange}
      />
    </main>
  );
}

export default CircuitWorkbenchPage;
