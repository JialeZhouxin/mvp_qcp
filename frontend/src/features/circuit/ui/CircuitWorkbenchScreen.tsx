import { useMemo, useState } from "react";

import CircuitCanvas from "../components/CircuitCanvas";
import GatePalette from "../components/GatePalette";
import QasmEditorPane from "../components/QasmEditorPane";
import QasmErrorPanel from "../components/QasmErrorPanel";
import WorkbenchGuide from "../components/WorkbenchGuide";
import WorkbenchHybridPanel from "../components/WorkbenchHybridPanel";
import WorkbenchProjectPanel from "../components/WorkbenchProjectPanel";
import WorkbenchResultPanel from "../components/WorkbenchResultPanel";
import WorkbenchSubmitPanel from "../components/WorkbenchSubmitPanel";
import { useWorkbenchHybridSubmit } from "../submission/use-workbench-hybrid-submit";
import { useWorkbenchTaskSubmit } from "../submission/use-workbench-task-submit";
import { type SimulationSchedulerLike, useWorkbenchSimulation } from "../simulation/use-workbench-simulation";
import { useWorkbenchDraftSync } from "./use-workbench-draft-sync";
import { useWorkbenchEditorState } from "./use-workbench-editor-state";
import { useWorkbenchGuideState } from "./use-workbench-guide-state";
import { useWorkbenchProjects } from "./use-workbench-projects";
import {
  getFutureOperationIdsAtSimulationStep,
  sliceCircuitBySimulationStep,
} from "./workbench-time-step";
import "./CircuitWorkbenchScreen.css";

const SUBMIT_RAIL_TOP_OFFSET = 12;
const SUBMIT_RAIL_Z_INDEX = 20;

interface CircuitWorkbenchScreenProps {
  readonly scheduler?: SimulationSchedulerLike;
}

function CircuitWorkbenchScreen({ scheduler }: CircuitWorkbenchScreenProps) {
  const [workbenchMode, setWorkbenchMode] = useState<"single" | "hybrid">("single");
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
    simulationStep,
    setSimulationStep,
  } = useWorkbenchEditorState();
  const { showGuide, dismissGuide } = useWorkbenchGuideState();

  const totalSimulationSteps = circuit.operations.length;

  useWorkbenchDraftSync({
    circuit,
    qasm,
    displayMode,
    simulationStep,
    resetVersion,
  });

  const previewCircuit = useMemo(
    () => sliceCircuitBySimulationStep(circuit, simulationStep),
    [circuit, simulationStep],
  );
  const futureOperationIds = useMemo(
    () => getFutureOperationIdsAtSimulationStep(circuit, simulationStep),
    [circuit, simulationStep],
  );

  const {
    simulationState,
    simError,
    probabilityView,
    probabilityDisplayView,
    epsilonText,
    blochVectors,
  } = useWorkbenchSimulation({
    circuit: previewCircuit,
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

  const {
    config: hybridConfig,
    setMaxIterations,
    setStepSize,
    setTolerance,
    submittingTask: hybridSubmittingTask,
    submittedTaskId: hybridSubmittedTaskId,
    taskStatusLabel: hybridTaskStatusLabel,
    submitError: hybridSubmitError,
    deduplicatedSubmit: hybridDeduplicatedSubmit,
    canSubmit: hybridCanSubmit,
    elapsedSeconds: hybridElapsedSeconds,
    canCancel: hybridCanCancel,
    iterations: hybridIterations,
    iterationCount: hybridIterationCount,
    latestObjective,
    bestObjective,
    latestCurrentBestGap,
    onSubmitHybrid,
    onCancelHybrid,
  } = useWorkbenchHybridSubmit({ numQubits: circuit.numQubits });

  const isHybridMode = workbenchMode === "hybrid";
  const railSubmitting = isHybridMode ? hybridSubmittingTask : submittingTask;
  const railCanSubmit = isHybridMode ? hybridCanSubmit : canSubmit;
  const railTaskId = isHybridMode ? hybridSubmittedTaskId : submittedTaskId;
  const railStatusLabel = isHybridMode ? hybridTaskStatusLabel : taskStatusLabel;
  const railError = isHybridMode ? hybridSubmitError : submitError;
  const railDeduplicated = isHybridMode ? hybridDeduplicatedSubmit : deduplicatedSubmit;
  const railElapsed = isHybridMode ? hybridElapsedSeconds : elapsedSeconds;

  return (
    <main data-testid="circuit-workbench-shell" className="circuit-workbench-shell">
      <WorkbenchGuide visible={showGuide} onDismiss={dismissGuide} />

      <section
        data-testid="workbench-submit-rail"
        className="circuit-workbench-submit-rail"
        style={{
          position: "sticky",
          top: SUBMIT_RAIL_TOP_OFFSET,
          zIndex: SUBMIT_RAIL_Z_INDEX,
        }}
      >
        <button
          type="button"
          data-testid="workbench-mode-toggle"
          onClick={() => setWorkbenchMode((previous) => (previous === "single" ? "hybrid" : "single"))}
          style={{ marginBottom: 8 }}
        >
          {isHybridMode ? "混合算法模式" : "单次任务模式"}
        </button>
        <WorkbenchSubmitPanel
          submitting={railSubmitting}
          canSubmit={railCanSubmit}
          taskId={railTaskId}
          taskStatusLabel={railStatusLabel}
          submitError={railError}
          deduplicated={railDeduplicated}
          elapsedSeconds={railElapsed}
          onSubmit={() => (isHybridMode ? void onSubmitHybrid() : void onSubmitTask())}
        />
        {isHybridMode ? (
          <WorkbenchHybridPanel
            maxIterations={hybridConfig.maxIterations}
            stepSize={hybridConfig.stepSize}
            tolerance={hybridConfig.tolerance}
            iterationCount={hybridIterationCount}
            latestObjective={latestObjective}
            bestObjective={bestObjective}
            latestCurrentBestGap={latestCurrentBestGap}
            canCancel={hybridCanCancel}
            iterations={hybridIterations}
            onMaxIterationsChange={setMaxIterations}
            onStepSizeChange={setStepSize}
            onToleranceChange={setTolerance}
            onCancel={() => void onCancelHybrid()}
          />
        ) : null}
      </section>

      <section
        data-testid="workbench-primary-layout"
        className="circuit-workbench-primary-layout"
      >
        <div data-testid="workbench-gate-column" className="circuit-workbench-gate-column">
          <GatePalette />
        </div>
        <div
          data-testid="workbench-main-workspace"
          className="circuit-workbench-main-workspace"
        >
          <div data-testid="workbench-canvas-column" className="circuit-workbench-canvas-column">
            <CircuitCanvas
              circuit={circuit}
              onCircuitChange={pushCircuit}
              onUndo={historyState.onUndo}
              onRedo={historyState.onRedo}
              controls={canvasControls}
              simulationStep={simulationStep}
              totalSimulationSteps={totalSimulationSteps}
              onSimulationStepChange={setSimulationStep}
              futureOperationIds={futureOperationIds}
            />
          </div>
          <div data-testid="workbench-qasm-column" className="circuit-workbench-qasm-column">
            <QasmEditorPane
              value={qasm}
              onValueChange={setQasm}
              onValidQasmChange={onValidQasmChange}
              onParseError={setParseError}
            />
            <QasmErrorPanel error={parseError} />
          </div>
        </div>
        <div className="circuit-workbench-result-slot">
          <WorkbenchResultPanel
            simulationState={simulationState}
            simError={simError}
            displayMode={displayMode}
            epsilonText={epsilonText}
            probabilityView={probabilityView}
            probabilityDisplayView={probabilityDisplayView}
            blochVectors={blochVectors}
            numQubits={previewCircuit.numQubits}
            onDisplayModeChange={setDisplayMode}
          />
        </div>
      </section>

      <WorkbenchProjectPanel
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
