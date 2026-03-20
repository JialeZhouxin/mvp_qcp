import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuthSession } from "../../auth/session";
import CodeEditor from "../../components/CodeEditor";
import ResultChart from "../../components/ResultChart";
import ProjectPanel from "../../components/task-center/ProjectPanel";
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
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>
          代码提交（Python/Qibo）
          <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 400 }}>
            <Link to="/tasks/center">进入任务中心</Link>
          </span>
        </h1>
        <button onClick={handleLogout}>退出登录</button>
      </header>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <CodeEditor value={code} onChange={setCode} />
        <button type="submit" disabled={loading}>
          {loading ? "提交中..." : "提交任务"}
        </button>
      </form>

      <section style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => void refreshTaskStatus()} disabled={!taskId}>
          刷新状态
        </button>
        <button onClick={() => void loadResult()} disabled={!taskId}>
          加载结果
        </button>
        <label>
          <input
            type="checkbox"
            checked={autoPolling}
            onChange={(event) => setAutoPolling(event.target.checked)}
          />
          自动轮询
        </label>
      </section>

      <section style={{ marginTop: 16 }}>
        <ProjectPanel
          entryType="code"
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

      <section style={{ marginTop: 16 }}>
        <p>Task ID: {taskId ?? "-"}</p>
        <p>Status: {status}</p>
        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
        {diagnosticText ? <p style={{ color: "#cf1322" }}>{diagnosticText}</p> : null}
      </section>

      {probabilities ? (
        <section style={{ marginTop: 16 }}>
          <ResultChart probabilities={probabilities} compact height={280} showTitle={false} />
        </section>
      ) : (
        <section style={{ marginTop: 16, padding: 12, background: "#f7f7f7" }}>
          <p style={{ margin: 0, color: "#666" }}>尚未获得可视化结果，请先提交并等待任务完成。</p>
        </section>
      )}

      {resultText ? <pre style={{ marginTop: 16, background: "#f4f4f4", padding: 12 }}>{resultText}</pre> : null}
    </main>
  );
}

export default CodeTasksScreen;
