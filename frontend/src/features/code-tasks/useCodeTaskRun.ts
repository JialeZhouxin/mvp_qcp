import { useEffect, useRef, useState } from "react";

import { toErrorMessage } from "../../api/errors";
import { getTaskCenterDetail } from "../../api/task-center";
import { getTaskResult, getTaskStatus, submitTask } from "../../api/tasks";
import {
  isFailureTaskStatus,
  isTerminalTaskStatus,
} from "../task-status/task-status";

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
      setError(toErrorMessage(nextError, "\u52a0\u8f7d\u4efb\u52a1\u7ed3\u679c\u5931\u8d25"));
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
      const tips = detail.diagnostic.suggestions.join("\uff1b");
      setDiagnosticText(tips ? `${line} | \u5efa\u8bae\uff1a${tips}` : line);
    } catch {
      setDiagnosticText(null);
    }
  };

  useEffect(() => {
    if (!taskId || !autoPolling || isTerminalTaskStatus(status)) {
      return;
    }

    pollingRef.current = window.setInterval(async () => {
      try {
        const data = await getTaskStatus(taskId);
        setStatus(data.status);
      } catch (nextError) {
        setError(toErrorMessage(nextError, "\u5237\u65b0\u4efb\u52a1\u72b6\u6001\u5931\u8d25"));
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
    if (taskId && isFailureTaskStatus(status)) {
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
      setError(toErrorMessage(nextError, "\u4efb\u52a1\u63d0\u4ea4\u5931\u8d25"));
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
      setError(toErrorMessage(nextError, "\u5237\u65b0\u4efb\u52a1\u72b6\u6001\u5931\u8d25"));
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
