import { useEffect, useMemo, useRef, useState } from "react";

import { toErrorMessage } from "../../../api/errors";
import {
  getTaskStatus as getTaskStatusApi,
  submitTask as submitTaskApi,
  type TaskStatusResponse,
  type TaskSubmitResponse,
} from "../../../api/tasks";
import type { TaskStreamCallbacks, TaskStreamConnection } from "../../realtime/task-stream-client";
import { connectTaskStatusStream as connectTaskStatusStreamApi } from "../../realtime/task-stream-client";
import { validateCircuitModel } from "../model/circuit-validation";
import type { CircuitModel } from "../model/types";
import type { QasmParseError } from "../qasm/qasm-errors";
import {
  buildIdempotencyKey,
  buildQiboTaskCode,
  buildSubmitFingerprint,
} from "./circuit-task-submit";

const SUBMIT_PARSE_ERROR_HINT = "QASM 解析失败，请先修复后再提交。";
const STATUS_REFRESH_ERROR_HINT = "任务状态刷新失败";
const TASK_SUBMIT_ERROR_HINT = "任务提交失败";
const POLLING_INTERVAL_MS = 3000;
const ELAPSED_TICK_MS = 1000;
const TERMINAL_TASK_STATUSES = new Set(["SUCCESS", "FAILURE", "TIMEOUT", "RETRY_EXHAUSTED"]);
const ACTIVE_TASK_STATUSES = new Set(["PENDING", "RUNNING"]);
const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "排队中",
  RUNNING: "执行中",
  SUCCESS: "执行成功",
  FAILURE: "执行失败",
  TIMEOUT: "执行超时",
  RETRY_EXHAUSTED: "重试耗尽",
};

export type TaskTrackingMode = "idle" | "sse" | "polling";

interface TimerDeps {
  readonly setIntervalFn: (handler: TimerHandler, timeout?: number) => number;
  readonly clearIntervalFn: (handle: number) => void;
}

interface TaskApiDeps {
  readonly submitTask: (code: string, options?: { readonly idempotencyKey?: string }) => Promise<TaskSubmitResponse>;
  readonly getTaskStatus: (taskId: number) => Promise<TaskStatusResponse>;
}

interface TaskStreamDeps {
  readonly connectTaskStatusStream: (
    taskIds: number[] | null,
    callbacks: TaskStreamCallbacks,
  ) => TaskStreamConnection;
}

export interface UseWorkbenchTaskSubmitDeps extends TaskApiDeps, TaskStreamDeps, TimerDeps {}

interface UseWorkbenchTaskSubmitParams {
  readonly circuit: CircuitModel;
  readonly parseError: QasmParseError | null;
  readonly deps?: Partial<UseWorkbenchTaskSubmitDeps>;
}

const DEFAULT_DEPS: UseWorkbenchTaskSubmitDeps = {
  submitTask: submitTaskApi,
  getTaskStatus: getTaskStatusApi,
  connectTaskStatusStream: connectTaskStatusStreamApi,
  setIntervalFn: (handler, timeout) => window.setInterval(handler, timeout),
  clearIntervalFn: (handle) => window.clearInterval(handle),
};

function isTerminalTaskStatus(status: string | null): boolean {
  return status !== null && TERMINAL_TASK_STATUSES.has(status);
}

function isActiveTaskStatus(status: string | null): boolean {
  return status !== null && ACTIVE_TASK_STATUSES.has(status);
}

function toTaskStatusLabel(status: string | null): string {
  if (!status) {
    return "-";
  }
  return TASK_STATUS_LABELS[status] ?? status;
}

function resolveSubmitBlockReason(
  circuit: CircuitModel,
  parseError: QasmParseError | null,
): string | null {
  if (parseError) {
    return SUBMIT_PARSE_ERROR_HINT;
  }
  const validation = validateCircuitModel(circuit);
  if (!validation.ok) {
    return `电路校验失败：${validation.error.message}`;
  }
  return null;
}

export function useWorkbenchTaskSubmit({ circuit, parseError, deps }: UseWorkbenchTaskSubmitParams) {
  const resolvedDeps = useMemo<UseWorkbenchTaskSubmitDeps>(
    () => ({ ...DEFAULT_DEPS, ...deps }),
    [deps],
  );

  const [submittingTask, setSubmittingTask] = useState(false);
  const [submittedTaskId, setSubmittedTaskId] = useState<number | null>(null);
  const [submittedTaskStatus, setSubmittedTaskStatus] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deduplicatedSubmit, setDeduplicatedSubmit] = useState(false);
  const [trackingMode, setTrackingMode] = useState<TaskTrackingMode>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const streamRef = useRef<TaskStreamConnection | null>(null);
  const pollingTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const trackedTaskIdRef = useRef<number | null>(null);
  const latestStatusRef = useRef<string | null>(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
  };

  const stopPolling = () => {
    if (pollingTimerRef.current !== null) {
      resolvedDeps.clearIntervalFn(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  const stopElapsedClock = () => {
    if (elapsedTimerRef.current !== null) {
      resolvedDeps.clearIntervalFn(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  };

  const stopTracking = () => {
    stopStream();
    stopPolling();
    stopElapsedClock();
    trackedTaskIdRef.current = null;
    setTrackingMode("idle");
  };

  const resetTracking = () => {
    stopTracking();
    setElapsedSeconds(0);
  };

  const applyTaskStatus = (status: string) => {
    latestStatusRef.current = status;
    setSubmittedTaskStatus(status);
    if (isTerminalTaskStatus(status)) {
      stopTracking();
    }
  };

  const pollTaskStatus = async (taskId: number) => {
    try {
      const response = await resolvedDeps.getTaskStatus(taskId);
      applyTaskStatus(response.status);
    } catch (error) {
      setSubmitError(toErrorMessage(error, STATUS_REFRESH_ERROR_HINT));
    }
  };

  const startPolling = (taskId: number) => {
    if (trackedTaskIdRef.current !== taskId || !isActiveTaskStatus(latestStatusRef.current)) {
      return;
    }
    stopStream();
    stopPolling();
    setTrackingMode("polling");
    pollingTimerRef.current = resolvedDeps.setIntervalFn(() => {
      void pollTaskStatus(taskId);
    }, POLLING_INTERVAL_MS);
    void pollTaskStatus(taskId);
  };

  const startElapsedClock = () => {
    stopElapsedClock();
    elapsedTimerRef.current = resolvedDeps.setIntervalFn(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, ELAPSED_TICK_MS);
  };

  const startStreamTracking = (taskId: number) => {
    try {
      streamRef.current = resolvedDeps.connectTaskStatusStream([taskId], {
        onStatus: (event) => {
          if (event.task_id !== taskId || trackedTaskIdRef.current !== taskId) {
            return;
          }
          applyTaskStatus(event.status);
        },
        onError: () => {
          startPolling(taskId);
        },
        onDisconnect: () => {
          startPolling(taskId);
        },
      });
      setTrackingMode("sse");
    } catch {
      startPolling(taskId);
    }
  };

  const startTracking = (taskId: number, status: string) => {
    latestStatusRef.current = status;
    if (!isActiveTaskStatus(status)) {
      stopTracking();
      return;
    }
    trackedTaskIdRef.current = taskId;
    setElapsedSeconds(0);
    startElapsedClock();
    stopPolling();
    startStreamTracking(taskId);
  };

  useEffect(() => {
    if (parseError) {
      setSubmitError(SUBMIT_PARSE_ERROR_HINT);
      return;
    }
    setSubmitError((previous) => (previous === SUBMIT_PARSE_ERROR_HINT ? null : previous));
  }, [parseError]);

  useEffect(() => {
    return () => {
      stopStream();
      stopPolling();
      stopElapsedClock();
    };
  }, []);

  async function onSubmitTask() {
    const blockedReason = resolveSubmitBlockReason(circuit, parseError);
    if (blockedReason) {
      setSubmitError(blockedReason);
      return;
    }

    setSubmittingTask(true);
    setSubmitError(null);
    setDeduplicatedSubmit(false);
    resetTracking();
    try {
      const generatedCode = buildQiboTaskCode(circuit);
      const fingerprint = buildSubmitFingerprint(circuit);
      const idempotencyKey = buildIdempotencyKey(fingerprint);
      const response = await resolvedDeps.submitTask(generatedCode, { idempotencyKey });
      setSubmittedTaskId(response.task_id);
      setSubmittedTaskStatus(response.status);
      setDeduplicatedSubmit(response.deduplicated === true);
      startTracking(response.task_id, response.status);
    } catch (error) {
      setSubmitError(toErrorMessage(error, TASK_SUBMIT_ERROR_HINT));
      stopTracking();
    } finally {
      setSubmittingTask(false);
    }
  }

  async function onRefreshTaskStatus() {
    if (!submittedTaskId) {
      return;
    }
    setSubmitError(null);
    try {
      const response = await resolvedDeps.getTaskStatus(submittedTaskId);
      applyTaskStatus(response.status);
    } catch (error) {
      setSubmitError(toErrorMessage(error, STATUS_REFRESH_ERROR_HINT));
    }
  }

  return {
    submittingTask,
    submittedTaskId,
    submittedTaskStatus,
    taskStatusLabel: toTaskStatusLabel(submittedTaskStatus),
    submitError,
    deduplicatedSubmit,
    canSubmit: parseError === null,
    trackingMode,
    isTracking: isActiveTaskStatus(submittedTaskStatus) && trackingMode !== "idle",
    elapsedSeconds,
    onSubmitTask,
    onRefreshTaskStatus,
  };
}
