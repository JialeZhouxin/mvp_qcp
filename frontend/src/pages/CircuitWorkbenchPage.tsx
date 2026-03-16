import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import CircuitCanvas from "../components/circuit/CircuitCanvas";
import GatePalette from "../components/circuit/GatePalette";
import QasmEditorPane from "../components/circuit/QasmEditorPane";
import QasmErrorPanel from "../components/circuit/QasmErrorPanel";
import WorkbenchGuide from "../components/circuit/WorkbenchGuide";
import WorkbenchResultPanel from "../components/circuit/WorkbenchResultPanel";
import WorkbenchSubmitPanel from "../components/circuit/WorkbenchSubmitPanel";
import WorkbenchToolbar from "../components/circuit/WorkbenchToolbar";
import ProjectPanel from "../components/task-center/ProjectPanel";
import { EDITOR_MAX_QUBITS, EDITOR_MIN_QUBITS } from "../features/circuit/model/constants";
import { evaluateComplexity, getLocalSimulationGuardMessage } from "../features/circuit/model/complexity-guard";
import { decreaseQubits, increaseQubits } from "../features/circuit/model/circuit-model";
import { validateCircuitModel } from "../features/circuit/model/circuit-validation";
import {
  canRedoHistory,
  canUndoHistory,
  createHistoryState,
  redoHistoryState,
  undoHistoryState,
  type EditorHistoryState,
} from "../features/circuit/model/history";
import { listCircuitTemplates, loadCircuitTemplate } from "../features/circuit/model/templates";
import type { CircuitModel } from "../features/circuit/model/types";
import { toQasm3 } from "../features/circuit/qasm/qasm-bridge";
import type { QasmParseError } from "../features/circuit/qasm/qasm-errors";
import {
  filterProbabilities,
  getProbabilityDisplayView,
  type ProbabilityDisplayMode,
  type ProbabilityFilterResult,
} from "../features/circuit/simulation/probability-filter";
import { SimulationScheduleError, createSimulationScheduler } from "../features/circuit/simulation/scheduler";
import { useWorkbenchTaskSubmit } from "../features/circuit/submission/use-workbench-task-submit";
import { clearWorkbenchDraft, saveWorkbenchDraft } from "../features/circuit/ui/draft-storage";
import { isWorkbenchGuideDismissed, setWorkbenchGuideDismissed } from "../features/circuit/ui/guide-preference";
import {
  areCircuitsEquivalent,
  buildInitialState,
  createDefaultCircuit,
  createNextHistoryState,
} from "../features/circuit/ui/workbench-model-utils";
import { useWorkbenchProjects } from "../features/circuit/ui/use-workbench-projects";

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

function CircuitWorkbenchPage({ scheduler }: CircuitWorkbenchPageProps) {
  const [initialState] = useState(() => buildInitialState(DEFAULT_DISPLAY_MODE));
  const [history, setHistory] = useState<EditorHistoryState<CircuitModel>>(() =>
    createHistoryState(initialState.circuit),
  );
  const [qasm, setQasm] = useState(() => initialState.qasm);
  const [displayMode, setDisplayMode] = useState<ProbabilityDisplayMode>(
    initialState.displayMode,
  );
  const [parseError, setParseError] = useState<QasmParseError | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [qubitMessage, setQubitMessage] = useState<string | null>(null);
  const [simulationState, setSimulationState] = useState<SimulationViewState>("IDLE");
  const [probabilityView, setProbabilityView] = useState<ProbabilityFilterResult | null>(null);
  const [showGuide, setShowGuide] = useState(() => !isWorkbenchGuideDismissed());
  const schedulerRef = useRef<SimulationSchedulerLike>(scheduler ?? createSimulationScheduler());

  const circuit = history.present;
  const templates = listCircuitTemplates();
  const {
    projectLoading,
    projectSaving,
    projectError,
    projectSuccess,
    projects,
    loadProjects,
    saveCurrentProject,
    loadProjectById,
  } = useWorkbenchProjects({
    circuit,
    qasm,
    displayMode,
    onProjectLoaded: (payload) => {
      setHistory(createHistoryState(payload.circuit));
      setQasm(payload.qasm);
      setDisplayMode(payload.displayMode);
      setParseError(null);
    },
  });
  const {
    submittingTask,
    submittedTaskId,
    submittedTaskStatus,
    submitError,
    deduplicatedSubmit,
    canSubmit,
    onSubmitTask,
    onRefreshTaskStatus,
  } = useWorkbenchTaskSubmit({ circuit, parseError });

  const runSimulation = async (model: CircuitModel) => {
    setSimulationState("RUNNING");
    const validation = validateCircuitModel(model);
    if (!validation.ok) {
      setSimError(`线路校验失败：${validation.error.message}`);
      setProbabilityView(null);
      setSimulationState("ERROR");
      return;
    }
    const simGuardMessage = getLocalSimulationGuardMessage(model);
    if (simGuardMessage) {
      setSimError(simGuardMessage);
      setProbabilityView(null);
      setSimulationState("ERROR");
      return;
    }
    const complexity = evaluateComplexity(model);
    if (!complexity.ok) {
      setSimError(`线路复杂度超限：${complexity.message ?? ""}`.trim());
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

  const onValidQasmChange = (nextModel: CircuitModel) => {
    if (!areCircuitsEquivalent(nextModel, circuit)) {
      pushCircuit(nextModel);
    }
  };

  const onClearCircuit = () => {
    setQubitMessage(null);
    pushCircuit({ numQubits: circuit.numQubits, operations: [] });
  };

  const onResetWorkbench = () => {
    const fallback = createDefaultCircuit();
    setHistory(createHistoryState(fallback));
    setQasm(toQasm3(fallback));
    setDisplayMode(DEFAULT_DISPLAY_MODE);
    setParseError(null);
    setQubitMessage(null);
    clearWorkbenchDraft();
  };

  const onIncreaseQubits = () => {
    const result = increaseQubits(circuit, {
      minQubits: EDITOR_MIN_QUBITS,
      maxQubits: EDITOR_MAX_QUBITS,
    });
    if (!result.ok) {
      setQubitMessage("已达到可编辑的最大量子比特数。");
      return;
    }
    setQubitMessage(null);
    pushCircuit(result.model);
  };

  const onDecreaseQubits = () => {
    const result = decreaseQubits(circuit, {
      minQubits: EDITOR_MIN_QUBITS,
      maxQubits: EDITOR_MAX_QUBITS,
    });
    if (!result.ok) {
      if (result.code === "QUBIT_SHRINK_BLOCKED_BY_OPERATION") {
        setQubitMessage("无法减少量子比特：高位量子比特上仍有门操作。");
      } else {
        setQubitMessage("已达到可编辑的最小量子比特数。");
      }
      return;
    }
    setQubitMessage(null);
    pushCircuit(result.model);
  };

  const canIncreaseQubits = circuit.numQubits < EDITOR_MAX_QUBITS;
  const canDecreaseQubits =
    decreaseQubits(circuit, {
      minQubits: EDITOR_MIN_QUBITS,
      maxQubits: EDITOR_MAX_QUBITS,
    }).ok;

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
          <Link to="/tasks/code">切换到代码提交模式</Link> · <Link to="/tasks/center">进入任务中心</Link>
        </p>
      </header>

      <WorkbenchGuide
        visible={showGuide}
        onDismiss={() => {
          setShowGuide(false);
          setWorkbenchGuideDismissed(true);
        }}
      />
      <WorkbenchToolbar
        canUndo={canUndoHistory(history)}
        canRedo={canRedoHistory(history)}
        currentQubits={circuit.numQubits}
        canIncreaseQubits={canIncreaseQubits}
        canDecreaseQubits={canDecreaseQubits}
        qubitMessage={qubitMessage}
        templates={templates}
        onUndo={() => setHistory((previous) => undoHistoryState(previous))}
        onRedo={() => setHistory((previous) => redoHistoryState(previous))}
        onIncreaseQubits={onIncreaseQubits}
        onDecreaseQubits={onDecreaseQubits}
        onClearCircuit={onClearCircuit}
        onResetWorkbench={onResetWorkbench}
        onLoadTemplate={(templateId) => pushCircuit(loadCircuitTemplate(templateId))}
      />

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <GatePalette />
          <CircuitCanvas circuit={circuit} onCircuitChange={(next) => pushCircuit(next)} />
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
        onDisplayModeChange={setDisplayMode}
      />

      <WorkbenchSubmitPanel
        submitting={submittingTask}
        canSubmit={canSubmit}
        taskId={submittedTaskId}
        taskStatus={submittedTaskStatus}
        submitError={submitError}
        deduplicated={deduplicatedSubmit}
        onSubmit={() => void onSubmitTask()}
        onRefreshStatus={() => void onRefreshTaskStatus()}
      />

      <ProjectPanel
        entryType="circuit"
        projects={projects}
        loading={projectLoading}
        saving={projectSaving}
        error={projectError}
        success={projectSuccess}
        onRefresh={() => void loadProjects()}
        onSave={(name) => void saveCurrentProject(name)}
        onLoad={(projectId) => void loadProjectById(projectId)}
      />

    </main>
  );
}

export default CircuitWorkbenchPage;
