import { FormEvent, useState } from "react";
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
    <main style={{ maxWidth: 980, margin: "24px auto", fontFamily: "Segoe UI, sans-serif" }}>
      <CodeTasksHeader onLogout={handleLogout} />

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <CodeEditor value={code} onChange={setCode} />
        <button type="submit" disabled={loading}>
          {loading ? "提交中..." : "提交代码任务"}
        </button>
      </form>

      <CodeTasksActions
        taskId={taskId}
        autoPolling={autoPolling}
        onAutoPollingChange={setAutoPolling}
        onRefreshStatus={() => void refreshTaskStatus()}
        onLoadResult={() => void loadResult()}
      />

      <section style={{ marginTop: 16 }}>
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
