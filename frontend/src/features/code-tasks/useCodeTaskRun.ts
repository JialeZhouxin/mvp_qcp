import { useEffect, useRef, useState } from "react";

import { toErrorMessage } from "../../api/errors";
import { getTaskCenterDetail } from "../../api/task-center";
import { getTaskResult } from "../../api/tasks";
import { isFailureTaskStatus } from "../../lib/task-status";
import { useTaskRuntime } from "../task-runtime/use-task-runtime";

export function useCodeTaskRun(code: string) {
  const [resultText, setResultText] = useState("");
  const [probabilities, setProbabilities] = useState<Record<string, number> | null>(null);
  const [diagnosticText, setDiagnosticText] = useState<string | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const lastLoadedResultTaskIdRef = useRef<number | null>(null);

  const {
    taskId,
    taskStatus,
    applyTaskStatus,
    submittingTask,
    taskError,
    autoPolling,
    setAutoPolling,
    refreshTaskStatus,
    submitTaskCode,
  } = useTaskRuntime({
    trackingStrategy: "polling-only",
    pollingIntervalMs: 1500,
    submitErrorHint: "任务提交失败",
    statusRefreshErrorHint: "刷新任务状态失败",
  });

  const loadResult = async () => {
    if (!taskId) {
      return;
    }
    setResultError(null);
    try {
      const data = await getTaskResult(taskId);
      applyTaskStatus(data.status);
      setResultText(JSON.stringify(data, null, 2));
      const probabilitiesPayload = data.result?.probabilities;
      setProbabilities(
        typeof probabilitiesPayload === "object" && probabilitiesPayload !== null
          ? (probabilitiesPayload as Record<string, number>)
          : null,
      );
    } catch (nextError) {
      setResultError(toErrorMessage(nextError, "加载任务结果失败"));
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
    if (taskStatus === "SUCCESS" && lastLoadedResultTaskIdRef.current !== taskId) {
      lastLoadedResultTaskIdRef.current = taskId;
      void loadResult();
    }
    if (taskId && isFailureTaskStatus(taskStatus)) {
      void loadTaskDiagnostic(taskId);
    }
  }, [taskStatus, taskId]);

  const submitCurrentCode = async () => {
    setResultText("");
    setProbabilities(null);
    setDiagnosticText(null);
    setResultError(null);
    lastLoadedResultTaskIdRef.current = null;
    await submitTaskCode(code);
  };

  return {
    taskId,
    status: taskStatus ?? "-",
    resultText,
    probabilities,
    loading: submittingTask,
    error: taskError ?? resultError,
    diagnosticText,
    autoPolling,
    setAutoPolling,
    loadResult,
    refreshTaskStatus,
    submitCurrentCode,
  };
}
