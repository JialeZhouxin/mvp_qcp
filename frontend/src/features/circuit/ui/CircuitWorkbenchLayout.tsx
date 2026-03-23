import CircuitCanvas from "../components/CircuitCanvas";
import GatePalette from "../components/GatePalette";
import ProjectPanel from "../../../components/projects/ProjectPanel";
import QasmEditorPane from "../components/QasmEditorPane";
import QasmErrorPanel from "../components/QasmErrorPanel";
import WorkbenchGuide from "../components/WorkbenchGuide";
import WorkbenchResultPanel from "../components/WorkbenchResultPanel";
import WorkbenchSubmitPanel from "../components/WorkbenchSubmitPanel";
import type { useCircuitWorkbenchController } from "./use-circuit-workbench-controller";

const SUBMIT_RAIL_TOP_OFFSET = 12;
const SUBMIT_RAIL_Z_INDEX = 20;

type CircuitWorkbenchControllerState = ReturnType<typeof useCircuitWorkbenchController>;

interface CircuitWorkbenchLayoutProps {
  readonly state: CircuitWorkbenchControllerState;
}

function CircuitWorkbenchLayout({ state }: CircuitWorkbenchLayoutProps) {
  return (
    <main style={{ maxWidth: 1320, margin: "24px auto", display: "grid", gap: 16 }}>
      <WorkbenchGuide visible={state.guide.showGuide} onDismiss={state.guide.dismissGuide} />

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
          submitting={state.submit.submittingTask}
          canSubmit={state.submit.canSubmit}
          taskId={state.submit.submittedTaskId}
          taskStatusLabel={state.submit.taskStatusLabel}
          submitError={state.submit.submitError}
          deduplicated={state.submit.deduplicatedSubmit}
          elapsedSeconds={state.submit.elapsedSeconds}
          onSubmit={() => void state.submit.onSubmitTask()}
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
            circuit={state.editor.circuit}
            onCircuitChange={state.editor.pushCircuit}
            onUndo={state.editor.historyState.onUndo}
            onRedo={state.editor.historyState.onRedo}
            controls={state.editor.canvasControls}
          />
        </div>
        <div data-testid="workbench-qasm-column" style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <QasmEditorPane
            value={state.editor.qasm}
            onValueChange={state.editor.setQasm}
            onValidQasmChange={state.editor.onValidQasmChange}
            onParseError={state.editor.setParseError}
          />
          <QasmErrorPanel error={state.editor.parseError} />
        </div>
      </section>

      <WorkbenchResultPanel
        simulationState={state.simulation.simulationState}
        simError={state.simulation.simError}
        displayMode={state.editor.displayMode}
        epsilonText={state.simulation.epsilonText}
        probabilityView={state.simulation.probabilityView}
        probabilityDisplayView={state.simulation.probabilityDisplayView}
        onDisplayModeChange={state.editor.setDisplayMode}
      />

      <ProjectPanel
        entryType="circuit"
        projects={state.projects.projects}
        loading={state.projects.projectLoading}
        saving={state.projects.projectSaving}
        error={state.projects.projectError}
        success={state.projects.projectSuccess}
        onRefresh={() => void state.projects.loadProjects()}
        onSave={(name) => void state.projects.saveCurrentProject(name)}
        onLoad={(projectId) => void state.projects.loadProjectById(projectId)}
      />
    </main>
  );
}

export default CircuitWorkbenchLayout;
