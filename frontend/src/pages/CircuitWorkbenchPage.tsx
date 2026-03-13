import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { toErrorMessage } from "../api/errors";
import { getProjectDetail, getProjectList, saveProject, type ProjectItem } from "../api/projects";
import CircuitCanvas from "../components/circuit/CircuitCanvas";
import GatePalette from "../components/circuit/GatePalette";
import QasmEditorPane from "../components/circuit/QasmEditorPane";
import QasmErrorPanel from "../components/circuit/QasmErrorPanel";
import WorkbenchGuide from "../components/circuit/WorkbenchGuide";
import WorkbenchResultPanel from "../components/circuit/WorkbenchResultPanel";
import WorkbenchToolbar from "../components/circuit/WorkbenchToolbar";
import ProjectPanel from "../components/task-center/ProjectPanel";
import { evaluateComplexity } from "../features/circuit/model/complexity-guard";
import { validateCircuitModel } from "../features/circuit/model/circuit-validation";
import {
  canRedoHistory,
  canUndoHistory,
  createHistoryState,
  redoHistoryState,
  undoHistoryState,
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
import { clearWorkbenchDraft, saveWorkbenchDraft } from "../features/circuit/ui/draft-storage";
import { isWorkbenchGuideDismissed, setWorkbenchGuideDismissed } from "../features/circuit/ui/guide-preference";
import {
  buildInitialState,
  createDefaultCircuit,
  createNextHistoryState,
  formatComplexityMessage,
  isCircuitModel,
  areCircuitsEquivalent,
} from "../features/circuit/ui/workbench-model-utils";

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
  const [simulationState, setSimulationState] = useState<SimulationViewState>("IDLE");
  const [probabilityView, setProbabilityView] = useState<ProbabilityFilterResult | null>(null);
  const [showGuide, setShowGuide] = useState(() => !isWorkbenchGuideDismissed());
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectSuccess, setProjectSuccess] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const schedulerRef = useRef<SimulationSchedulerLike>(scheduler ?? createSimulationScheduler());

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

  async function loadProjects() {
    setProjectLoading(true);
    setProjectError(null);
    try {
      const response = await getProjectList(50, 0);
      setProjects(response.projects);
    } catch (error) {
      setProjectError(toErrorMessage(error, "项目列表加载失败"));
    } finally {
      setProjectLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  const pushCircuit = (next: CircuitModel) => {
    setHistory((previous) => createNextHistoryState(previous, next));
  };

  const onValidQasmChange = (nextModel: CircuitModel) => {
    if (!areCircuitsEquivalent(nextModel, circuit)) {
      pushCircuit(nextModel);
    }
  };

  const onClearCircuit = () => {
    pushCircuit({ numQubits: circuit.numQubits, operations: [] });
  };

  const onResetWorkbench = () => {
    const fallback = createDefaultCircuit();
    setHistory(createHistoryState(fallback));
    setQasm(toQasm3(fallback));
    setDisplayMode(DEFAULT_DISPLAY_MODE);
    setParseError(null);
    clearWorkbenchDraft();
  };

  async function onSaveProject(name: string) {
    if (!name.trim()) {
      setProjectError("项目名不能为空");
      return;
    }
    setProjectSaving(true);
    setProjectError(null);
    setProjectSuccess(null);
    try {
      await saveProject(name.trim(), {
        entry_type: "circuit",
        payload: {
          circuit,
          qasm,
          display_mode: displayMode,
        },
      });
      setProjectSuccess("项目已保存");
      await loadProjects();
    } catch (error) {
      setProjectError(toErrorMessage(error, "项目保存失败"));
    } finally {
      setProjectSaving(false);
    }
  }

  async function onLoadProject(projectId: number) {
    setProjectError(null);
    setProjectSuccess(null);
    try {
      const detail = await getProjectDetail(projectId);
      if (!isCircuitModel(detail.payload.circuit)) {
        throw new Error("项目内容缺少有效 circuit");
      }
      if (typeof detail.payload.qasm !== "string") {
        throw new Error("项目内容缺少 qasm");
      }
      const restoredMode = detail.payload.display_mode === "ALL" ? "ALL" : "FILTERED";
      setHistory(createHistoryState(detail.payload.circuit));
      setQasm(detail.payload.qasm);
      setDisplayMode(restoredMode);
      setParseError(null);
      setProjectSuccess(`已加载项目：${detail.name}`);
    } catch (error) {
      setProjectError(toErrorMessage(error, "项目加载失败"));
    }
  }

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

      <WorkbenchGuide visible={showGuide} onDismiss={() => {
        setShowGuide(false);
        setWorkbenchGuideDismissed(true);
      }} />
      <WorkbenchToolbar
        canUndo={canUndoHistory(history)}
        canRedo={canRedoHistory(history)}
        templates={templates}
        onUndo={() => setHistory((previous) => undoHistoryState(previous))}
        onRedo={() => setHistory((previous) => redoHistoryState(previous))}
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

      <ProjectPanel
        entryType="circuit"
        projects={projects}
        loading={projectLoading}
        saving={projectSaving}
        error={projectError}
        success={projectSuccess}
        onRefresh={() => void loadProjects()}
        onSave={(name) => void onSaveProject(name)}
        onLoad={(projectId) => void onLoadProject(projectId)}
      />

      <WorkbenchResultPanel
        simulationState={simulationState}
        simError={simError}
        displayMode={displayMode}
        epsilonText={epsilonText}
        probabilityView={probabilityView}
        probabilityDisplayView={probabilityDisplayView}
        onDisplayModeChange={setDisplayMode}
      />
    </main>
  );
}

export default CircuitWorkbenchPage;
