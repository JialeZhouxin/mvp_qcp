import { useEffect, useRef, useState } from "react";

import { toErrorMessage } from "../../api/errors";
import { getTaskCenterDetail } from "../../api/task-center";
import { getTaskResult, getTaskStatus, submitTask } from "../../api/tasks";

const TERMINAL_STATUSES = new Set(["SUCCESS", "FAILURE", "TIMEOUT", "RETRY_EXHAUSTED"]);
const FAILURE_STATUSES = new Set(["FAILURE", "TIMEOUT", "RETRY_EXHAUSTED"]);
const POLL_INTERVAL_MS = 1500;

export function useCodeTaskRun(code: string) {
  const [taskId, setTaskId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("-");
  const [resultText, setResultText] = useState("");
  const [probabilities, setProbabilities] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticText, setDiagnosticText] = useState<string | null>(null);
  const [autoPolling, setAutoPolling] = useState(true);
  const pollingRef = useRef<number | null>(null);

  const loadResult = async () => {
    if (!taskId) {
      return;
    }
    setError(null);
    try {
      const data = await getTaskResult(taskId);
      setStatus(data.status);
      setResultText(JSON.stringify(data, null, 2));
      const probabilitiesPayload = data.result?.probabilities;
      setProbabilities(
        typeof probabilitiesPayload === "object" && probabilitiesPayload !== null
          ? (probabilitiesPayload as Record<string, number>)
          : null,
      );
    } catch (nextError) {
      setError(toErrorMessage(nextError, "加载任务结果失败"));
    }
  };

  const loadTaskDiagnostic = async (currentTaskId: number) => {
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
  };

  useEffect(() => {
    if (!taskId || !autoPolling || TERMINAL_STATUSES.has(status)) {
      return;
    }

    pollingRef.current = window.setInterval(async () => {
      try {
        const data = await getTaskStatus(taskId);
        setStatus(data.status);
      } catch (nextError) {
        setError(toErrorMessage(nextError, "刷新任务状态失败"));
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }
      pollingRef.current = null;
    };
  }, [autoPolling, status, taskId]);

  useEffect(() => {
    if (status === "SUCCESS") {
      void loadResult();
    }
    if (taskId && FAILURE_STATUSES.has(status)) {
      void loadTaskDiagnostic(taskId);
    }
  }, [status, taskId]);

  const submitCurrentCode = async () => {
    setError(null);
    setLoading(true);
    setResultText("");
    setProbabilities(null);
    setDiagnosticText(null);

    try {
      const data = await submitTask(code);
      setTaskId(data.task_id);
      setStatus(data.status);
    } catch (nextError) {
      setError(toErrorMessage(nextError, "任务提交失败"));
    } finally {
      setLoading(false);
    }
  };

  const refreshTaskStatus = async () => {
    if (!taskId) {
      return;
    }
    setError(null);
    try {
      const data = await getTaskStatus(taskId);
      setStatus(data.status);
    } catch (nextError) {
      setError(toErrorMessage(nextError, "刷新任务状态失败"));
    }
  };

  return {
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
  };
}
