import { useWorkbenchTaskSubmit } from "../submission/use-workbench-task-submit";
import {
  type SimulationSchedulerLike,
  useWorkbenchSimulation,
} from "../simulation/use-workbench-simulation";
import { useWorkbenchDraftSync } from "./use-workbench-draft-sync";
import { useWorkbenchEditorState } from "./use-workbench-editor-state";
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
