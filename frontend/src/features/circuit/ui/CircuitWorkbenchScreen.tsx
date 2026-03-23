import CircuitCanvas from "../components/CircuitCanvas";
import GatePalette from "../components/GatePalette";
import ProjectPanel from "../../../components/projects/ProjectPanel";
import QasmEditorPane from "../components/QasmEditorPane";
import QasmErrorPanel from "../components/QasmErrorPanel";
import WorkbenchGuide from "../components/WorkbenchGuide";
import WorkbenchResultPanel from "../components/WorkbenchResultPanel";
import WorkbenchSubmitPanel from "../components/WorkbenchSubmitPanel";
import { useWorkbenchTaskSubmit } from "../submission/use-workbench-task-submit";
import { type SimulationSchedulerLike, useWorkbenchSimulation } from "../simulation/use-workbench-simulation";
import { useWorkbenchDraftSync } from "./use-workbench-draft-sync";
import { useWorkbenchEditorState } from "./use-workbench-editor-state";
import { useWorkbenchGuideState } from "./use-workbench-guide-state";
import { useWorkbenchProjects } from "./use-workbench-projects";

const SUBMIT_RAIL_TOP_OFFSET = 12;
const SUBMIT_RAIL_Z_INDEX = 20;

interface CircuitWorkbenchScreenProps {
  readonly scheduler?: SimulationSchedulerLike;
}

function CircuitWorkbenchScreen({ scheduler }: CircuitWorkbenchScreenProps) {
  const {
    circuit,
    qasm,
    setQasm,
    displayMode,
    setDisplayMode,
    parseError,
    setParseError,
    pushCircuit,
    onValidQasmChange,
    replaceFromProject,
    historyState,
    canvasControls,
    resetVersion,
  } = useWorkbenchEditorState();
  const { showGuide, dismissGuide } = useWorkbenchGuideState();

  useWorkbenchDraftSync({
    circuit,
    qasm,
    displayMode,
    resetVersion,
    onRestore: replaceFromProject,
  });

  const {
    simulationState,
    simError,
    probabilityView,
    probabilityDisplayView,
    epsilonText,
  } = useWorkbenchSimulation({
    circuit,
    displayMode,
    scheduler,
  });

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
    onProjectLoaded: replaceFromProject,
  });

  const {
    submittingTask,
    submittedTaskId,
    taskStatusLabel,
    submitError,
    deduplicatedSubmit,
    canSubmit,
    elapsedSeconds,
    onSubmitTask,
  } = useWorkbenchTaskSubmit({ circuit, parseError });

  return (
    <main style={{ maxWidth: 1320, margin: "24px auto", display: "grid", gap: 16 }}>
      <WorkbenchGuide visible={showGuide} onDismiss={dismissGuide} />

      <section
        data-testid="workbench-submit-rail"
        style={{
          position: "sticky",
          top: SUBMIT_RAIL_TOP_OFFSET,
          zIndex: SUBMIT_RAIL_Z_INDEX,
          background: "#f5f7fb",
          borderRadius: 8,
        }}
      >
        <WorkbenchSubmitPanel
          submitting={submittingTask}
          canSubmit={canSubmit}
          taskId={submittedTaskId}
          taskStatusLabel={taskStatusLabel}
          submitError={submitError}
          deduplicated={deduplicatedSubmit}
          elapsedSeconds={elapsedSeconds}
          onSubmit={() => void onSubmitTask()}
        />
      </section>

      <section
        data-testid="workbench-primary-layout"
        style={{
          display: "grid",
          gap: 16,
          alignItems: "start",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 4fr) minmax(0, 1fr)",
        }}
      >
        <div data-testid="workbench-gate-column" style={{ minWidth: 0 }}>
          <GatePalette />
        </div>
        <div data-testid="workbench-canvas-column" style={{ minWidth: 0 }}>
          <CircuitCanvas
            circuit={circuit}
            onCircuitChange={pushCircuit}
            onUndo={historyState.onUndo}
            onRedo={historyState.onRedo}
            controls={canvasControls}
          />
        </div>
        <div data-testid="workbench-qasm-column" style={{ display: "grid", gap: 12, minWidth: 0 }}>
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

export default CircuitWorkbenchScreen;


