import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getTotalGates } from "../model/circuit-model";
import { useWorkbenchTaskSubmit } from "../submission/use-workbench-task-submit";
import {
  type SimulationSchedulerLike,
  useWorkbenchSimulation,
} from "../simulation/use-workbench-simulation";
import { useWorkbenchDraftSync } from "./use-workbench-draft-sync";
import {
  type WorkbenchProjectPayload,
  useWorkbenchEditorState,
} from "./use-workbench-editor-state";
import { useWorkbenchGuideState } from "./use-workbench-guide-state";
import { useWorkbenchProjects } from "./use-workbench-projects";

interface UseCircuitWorkbenchControllerParams {
  readonly scheduler?: SimulationSchedulerLike;
}

export function useCircuitWorkbenchController({ scheduler }: UseCircuitWorkbenchControllerParams) {
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
    canvasControls: baseCanvasControls,
    resetVersion,
  } = useWorkbenchEditorState();
  const { showGuide, dismissGuide } = useWorkbenchGuideState();
  const totalGates = getTotalGates(circuit);
  const [executionGateCount, setExecutionGateCount] = useState(totalGates);

  useEffect(() => {
    setExecutionGateCount((current) => {
      const capped = Math.min(Math.max(current, 0), totalGates);
      return capped === current ? current : capped;
    });
  }, [totalGates]);

  const previousResetVersionRef = useRef(resetVersion);
  useEffect(() => {
    if (previousResetVersionRef.current === resetVersion) {
      return;
    }
    previousResetVersionRef.current = resetVersion;
    setExecutionGateCount(getTotalGates(circuit));
  }, [circuit, resetVersion]);

  const restoreWorkbench = useCallback(
    (payload: WorkbenchProjectPayload) => {
      replaceFromProject(payload);
      setExecutionGateCount(getTotalGates(payload.circuit));
    },
    [replaceFromProject],
  );

  const onExecutionGateCountCommit = useCallback(
    (nextValue: number) => {
      const normalized = Number.isFinite(nextValue) ? Math.trunc(nextValue) : 0;
      setExecutionGateCount(Math.min(Math.max(normalized, 0), totalGates));
    },
    [totalGates],
  );

  const canvasControls = useMemo(
    () => ({
      ...baseCanvasControls,
      executionGateCount,
      executionGateCountMax: totalGates,
      onExecutionGateCountCommit,
    }),
    [baseCanvasControls, executionGateCount, totalGates, onExecutionGateCountCommit],
  );

  useWorkbenchDraftSync({
    circuit,
    qasm,
    displayMode,
    resetVersion,
    onRestore: restoreWorkbench,
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
    executionGateCount,
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
    onProjectLoaded: restoreWorkbench,
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

  return {
    guide: {
      showGuide,
      dismissGuide,
    },
    editor: {
      circuit,
      qasm,
      setQasm,
      displayMode,
      setDisplayMode,
      parseError,
      setParseError,
      pushCircuit,
      onValidQasmChange,
      historyState,
      canvasControls,
    },
    simulation: {
      simulationState,
      simError,
      probabilityView,
      probabilityDisplayView,
      epsilonText,
    },
    projects: {
      projectLoading,
      projectSaving,
      projectError,
      projectSuccess,
      projects,
      loadProjects,
      saveCurrentProject,
      loadProjectById,
    },
    submit: {
      submittingTask,
      submittedTaskId,
      taskStatusLabel,
      submitError,
      deduplicatedSubmit,
      canSubmit,
      elapsedSeconds,
      onSubmitTask,
    },
  };
}
