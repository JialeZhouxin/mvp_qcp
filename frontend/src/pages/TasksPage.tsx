import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { toErrorMessage } from "../api/errors";
import { getProjectDetail, getProjectList, saveProject, type ProjectItem } from "../api/projects";
import { getTaskCenterDetail } from "../api/task-center";
import { getTaskResult, getTaskStatus, submitTask } from "../api/tasks";
import { clearToken } from "../auth/token";
import CodeEditor from "../components/CodeEditor";
import ResultChart from "../components/ResultChart";
import ProjectPanel from "../components/task-center/ProjectPanel";

const SAMPLE_CODE = `from qibo import Circuit, gates\n\n\nSHOTS = 1024\n\n\ndef main():\n    # 1) 创建两量子比特线路\n    circuit = Circuit(2)\n\n    # 2) H + CNOT 制备 Bell 态 (|00> + |11>) / sqrt(2)\n    circuit.add(gates.H(0))\n    circuit.add(gates.CNOT(0, 1))\n\n    # 3) 在计算基测量两个量子比特\n    circuit.add(gates.M(0, 1))\n\n    # 4) 运行并统计测量结果\n    result = circuit(nshots=SHOTS)\n    counts = result.frequencies(binary=True)\n\n    # 5) 返回后端约定格式，前端可直接渲染概率柱状图\n    return {"counts": dict(counts)}\n`;

function TasksPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState(SAMPLE_CODE);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("-");
  const [resultText, setResultText] = useState<string>("");
  const [probabilities, setProbabilities] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticText, setDiagnosticText] = useState<string | null>(null);
  const [autoPolling, setAutoPolling] = useState(true);
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectSuccess, setProjectSuccess] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const pollingRef = useRef<number | null>(null);

  async function onLoadResult() {
    if (!taskId) {
      return;
    }
    setError(null);
    try {
      const data = await getTaskResult(taskId);
      setStatus(data.status);
      setResultText(JSON.stringify(data, null, 2));
      setProbabilities(data.result?.probabilities ?? null);
    } catch (err) {
      setError(toErrorMessage(err, "result query failed"));
    }
  }

  async function loadTaskDiagnostic(currentTaskId: number) {
    try {
      const detail = await getTaskCenterDetail(currentTaskId);
      if (!detail.diagnostic) {
        setDiagnosticText(null);
        return;
      }
      const line = `[${detail.diagnostic.code}] ${detail.diagnostic.summary ?? detail.diagnostic.message}`;
      const tips = detail.diagnostic.suggestions.join("；");
      setDiagnosticText(tips ? `${line} | 建议：${tips}` : line);
    } catch {
      setDiagnosticText(null);
    }
  }

  useEffect(() => {
    if (!taskId || !autoPolling) {
      return;
    }
    if (status === "SUCCESS" || status === "FAILURE") {
      return;
    }

    pollingRef.current = window.setInterval(async () => {
      try {
        const data = await getTaskStatus(taskId);
        setStatus(data.status);
      } catch (err) {
        setError(toErrorMessage(err, "status query failed"));
      }
    }, 1500);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }
      pollingRef.current = null;
    };
  }, [taskId, autoPolling, status]);

  useEffect(() => {
    if (status === "SUCCESS") {
      void onLoadResult();
    }
    if (taskId && (status === "FAILURE" || status === "TIMEOUT" || status === "RETRY_EXHAUSTED")) {
      void loadTaskDiagnostic(taskId);
    }
  }, [status, taskId]);

  async function loadProjects() {
    setProjectLoading(true);
    setProjectError(null);
    try {
      const response = await getProjectList(50, 0);
      setProjects(response.projects);
    } catch (err) {
      setProjectError(toErrorMessage(err, "项目列表加载失败"));
    } finally {
      setProjectLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setResultText("");
    setProbabilities(null);
    setDiagnosticText(null);

    try {
      const data = await submitTask(code);
      setTaskId(data.task_id);
      setStatus(data.status);
    } catch (err) {
      setError(toErrorMessage(err, "submit failed"));
    } finally {
      setLoading(false);
    }
  }

  async function onRefreshStatus() {
    if (!taskId) {
      return;
    }
    setError(null);
    try {
      const data = await getTaskStatus(taskId);
      setStatus(data.status);
    } catch (err) {
      setError(toErrorMessage(err, "status query failed"));
    }
  }

  function onLogout() {
    clearToken();
    navigate("/login", { replace: true });
  }

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
        entry_type: "code",
        payload: { code },
        last_task_id: taskId,
      });
      setProjectSuccess("项目已保存");
      await loadProjects();
    } catch (err) {
      setProjectError(toErrorMessage(err, "项目保存失败"));
    } finally {
      setProjectSaving(false);
    }
  }

  async function onLoadProject(projectId: number) {
    setProjectError(null);
    setProjectSuccess(null);
    try {
      const detail = await getProjectDetail(projectId);
      const loadedCode = detail.payload.code;
      if (typeof loadedCode !== "string") {
        throw new Error("项目内容缺少 code 字段");
      }
      setCode(loadedCode);
      setProjectSuccess(`已加载项目：${detail.name}`);
    } catch (err) {
      setProjectError(toErrorMessage(err, "项目加载失败"));
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: "24px auto", fontFamily: "Segoe UI, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>
          任务提交
          <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 400 }}>
            <Link to="/tasks/center">进入任务中心</Link>
          </span>
        </h1>
        <button onClick={onLogout}>退出登录</button>
      </header>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <CodeEditor value={code} onChange={setCode} />
        <button type="submit" disabled={loading}>{loading ? "提交中..." : "提交任务"}</button>
      </form>

      <section style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={onRefreshStatus} disabled={!taskId}>刷新状态</button>
        <button onClick={onLoadResult} disabled={!taskId}>获取结果</button>
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
          onSave={(name) => void onSaveProject(name)}
          onLoad={(projectId) => void onLoadProject(projectId)}
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
          <ResultChart probabilities={probabilities} />
        </section>
      ) : (
        <section style={{ marginTop: 16, padding: 12, background: "#f7f7f7" }}>
          <p style={{ margin: 0, color: "#666" }}>暂无概率图，请提交任务并等待执行完成。</p>
        </section>
      )}

      {resultText ? <pre style={{ marginTop: 16, background: "#f4f4f4", padding: 12 }}>{resultText}</pre> : null}
    </main>
  );
}

export default TasksPage;
