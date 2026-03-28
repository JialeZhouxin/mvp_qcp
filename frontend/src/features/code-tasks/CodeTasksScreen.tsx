import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthSession } from "../../auth/session";
import CodeEditor from "../../components/CodeEditor";
import CodeTasksActions from "./CodeTasksActions";
import CodeTasksHeader from "./CodeTasksHeader";
import CodeTasksResultPanel from "./CodeTasksResultPanel";
import CodeTasksStatusPanel from "./CodeTasksStatusPanel";
import CodeProjectPanel from "./components/CodeProjectPanel";
import { useCodeProjects } from "./useCodeProjects";
import { useCodeTaskRun } from "./useCodeTaskRun";
import "./CodeTasksScreen.css";

const SAMPLE_CODE = `from qibo import Circuit, gates

SHOTS = 1024

def main():
    circuit = Circuit(2)
    circuit.add(gates.H(0))
    circuit.add(gates.CNOT(0, 1))
    circuit.add(gates.M(0, 1))

    result = circuit(nshots=SHOTS)
    counts = result.frequencies(binary=True)
    return {"counts": dict(counts)}
`;

function CodeTasksScreen() {
  const navigate = useNavigate();
  const { logout } = useAuthSession();
  const [code, setCode] = useState(SAMPLE_CODE);
  const {
    taskId,
    status,
    resultText,
    probabilities,
    loading,
    error,
    diagnosticText,
    autoPolling,
    setAutoPolling,
    loadResult,
    refreshTaskStatus,
    submitCurrentCode,
  } = useCodeTaskRun(code);
  const {
    projectLoading,
    projectSaving,
    projectError,
    projectSuccess,
    projects,
    loadProjects,
    saveCurrentProject,
    loadProjectById,
  } = useCodeProjects({
    code,
    taskId,
    onProjectLoaded: (loadedCode) => setCode(loadedCode),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submitCurrentCode();
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="code-tasks-screen">
      <CodeTasksHeader onLogout={handleLogout} />

      <form onSubmit={handleSubmit} className="code-tasks-screen__form">
        <CodeEditor value={code} onChange={setCode} />
        <button className="code-tasks-screen__submit" type="submit" disabled={loading}>
          {loading ? "\u63D0\u4EA4\u4E2D..." : "\u63D0\u4EA4\u4EE3\u7801\u4EFB\u52A1"}
        </button>
      </form>

      <CodeTasksActions
        taskId={taskId}
        autoPolling={autoPolling}
        onAutoPollingChange={setAutoPolling}
        onRefreshStatus={() => void refreshTaskStatus()}
        onLoadResult={() => void loadResult()}
      />

      <section className="code-tasks-screen__project-section">
        <CodeProjectPanel
          projects={projects}
          loading={projectLoading}
          saving={projectSaving}
          error={projectError}
          success={projectSuccess}
          onRefresh={() => void loadProjects()}
          onSave={(name) => void saveCurrentProject(name)}
          onLoad={(projectId) => void loadProjectById(projectId)}
        />
      </section>

      <CodeTasksStatusPanel
        taskId={taskId}
        status={status}
        error={error}
        diagnosticText={diagnosticText}
      />
      <CodeTasksResultPanel probabilities={probabilities} resultText={resultText} />
    </main>
  );
}

export default CodeTasksScreen;
