import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { toErrorMessage } from "../api/errors";
import { getTaskResult, getTaskStatus, submitTask } from "../api/tasks";
import { clearToken } from "../auth/token";
import CodeEditor from "../components/CodeEditor";
import ResultChart from "../components/ResultChart";

const SAMPLE_CODE = `from qibo import Circuit\n\n\ndef main():\n    # MVP 约定：返回 counts 字典即可\n    return {"counts": {"00": 512, "11": 512}}\n`;

function TasksPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState(SAMPLE_CODE);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("-");
  const [resultText, setResultText] = useState<string>("");
  const [probabilities, setProbabilities] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoPolling, setAutoPolling] = useState(true);
  const pollingRef = useRef<number | null>(null);

  async function onLoadResult() {
    if (!taskId) return;
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
  }, [status]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setResultText("");
    setProbabilities(null);

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
    if (!taskId) return;
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

  return (
    <main style={{ maxWidth: 980, margin: "24px auto", fontFamily: "Segoe UI, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>任务提交</h1>
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
            onChange={(e) => setAutoPolling(e.target.checked)}
          />
          自动轮询
        </label>
      </section>

      <section style={{ marginTop: 16 }}>
        <p>Task ID: {taskId ?? "-"}</p>
        <p>Status: {status}</p>
        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
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
