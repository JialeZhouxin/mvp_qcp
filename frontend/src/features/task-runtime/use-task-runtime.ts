import { useEffect, useMemo, useRef, useState } from "react";

import { toErrorMessage } from "../../api/errors";
import {
  getTaskStatus as getTaskStatusApi,
  submitTask as submitTaskApi,
  type TaskStatusResponse,
  type TaskSubmitResponse,
} from "../../api/tasks";
import type { TaskStreamCallbacks, TaskStreamConnection } from "../../api/task-stream";
import { subscribeTaskStream as connectTaskStatusStreamApi } from "../../api/task-stream";
import {
  isActiveTaskStatus,
  toTaskStatusLabel,
} from "../../lib/task-status";
import {
  type TaskStatusTrackingDeps,
  useTaskStatusTracking,
} from "./use-task-status-tracking";

const DEFAULT_POLLING_INTERVAL_MS = 3000;
const ELAPSED_TICK_MS = 1000;

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

export interface UseTaskRuntimeDeps extends TaskApiDeps, TaskStreamDeps, TimerDeps {}

export type TaskRuntimeTrackingStrategy = "stream-first" | "polling-only";

interface SubmitTaskCodeOptions {
  readonly idempotencyKey?: string;
}

interface UseTaskRuntimeParams {
  readonly deps?: Partial<UseTaskRuntimeDeps>;
  readonly trackingStrategy: TaskRuntimeTrackingStrategy;
  readonly initialAutoPolling?: boolean;
  readonly submitErrorHint: string;
  readonly statusRefreshErrorHint: string;
  readonly pollingIntervalMs?: number;
}

const DEFAULT_DEPS: UseTaskRuntimeDeps = {
  submitTask: submitTaskApi,
  getTaskStatus: getTaskStatusApi,
  connectTaskStatusStream: connectTaskStatusStreamApi,
  setIntervalFn: (handler, timeout) => window.setInterval(handler, timeout),
  clearIntervalFn: (handle) => window.clearInterval(handle),
};

export function useTaskRuntime({
  deps,
  trackingStrategy,
  initialAutoPolling = true,
  submitErrorHint,
  statusRefreshErrorHint,
  pollingIntervalMs = DEFAULT_POLLING_INTERVAL_MS,
}: UseTaskRuntimeParams) {
  const resolvedDeps = useMemo<UseTaskRuntimeDeps>(
    () => ({ ...DEFAULT_DEPS, ...deps }),
    [deps],
  );
  const trackingDeps = resolvedDeps as TaskStatusTrackingDeps;

  const [taskId, setTaskId] = useState<number | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [deduplicatedSubmit, setDeduplicatedSubmit] = useState(false);
  const [autoPolling, setAutoPolling] = useState(initialAutoPolling);
  const [pollingElapsedSeconds, setPollingElapsedSeconds] = useState(0);

  const pollingTimerRef = useRef<number | null>(null);
  const pollingElapsedTimerRef = useRef<number | null>(null);

  const {
    trackingMode: streamTrackingMode,
    elapsedSeconds: streamElapsedSeconds,
    startTracking,
    stopTracking,
    resetTracking,
    pollTaskStatus,
  } = useTaskStatusTracking({
    deps: trackingDeps,
    onStatusUpdated: setTaskStatus,
    onStatusRefreshError: (error) => {
      setTaskError(toErrorMessage(error, statusRefreshErrorHint));
    },
  });

  const clearPollingTimer = () => {
    if (pollingTimerRef.current !== null) {
      resolvedDeps.clearIntervalFn(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  const clearPollingElapsedTimer = () => {
    if (pollingElapsedTimerRef.current !== null) {
      resolvedDeps.clearIntervalFn(pollingElapsedTimerRef.current);
      pollingElapsedTimerRef.current = null;
    }
  };

  const resetPollingTracking = () => {
    clearPollingTimer();
    clearPollingElapsedTimer();
    setPollingElapsedSeconds(0);
  };

  const refreshTaskStatus = async () => {
    if (!taskId) {
      return;
    }
    setTaskError(null);
    if (trackingStrategy === "stream-first") {
      await pollTaskStatus(taskId);
      return;
    }
    try {
      const response = await resolvedDeps.getTaskStatus(taskId);
      setTaskStatus(response.status);
    } catch (error) {
      setTaskError(toErrorMessage(error, statusRefreshErrorHint));
    }
  };

  const submitTaskCode = async (code: string, options: SubmitTaskCodeOptions = {}) => {
    await submitTaskRequest(() => resolvedDeps.submitTask(code, options));
  };

  const submitTaskRequest = async (request: () => Promise<TaskSubmitResponse>) => {
    setSubmittingTask(true);
    setTaskError(null);
    setDeduplicatedSubmit(false);
    if (trackingStrategy === "stream-first") {
      resetTracking();
    } else {
      resetPollingTracking();
    }

    try {
      const response = await request();
      setTaskId(response.task_id);
      setTaskStatus(response.status);
      setDeduplicatedSubmit(response.deduplicated === true);
      if (trackingStrategy === "stream-first" && autoPolling) {
        startTracking(response.task_id, response.status);
      }
    } catch (error) {
      setTaskError(toErrorMessage(error, submitErrorHint));
      if (trackingStrategy === "stream-first") {
        stopTracking();
      }
    } finally {
      setSubmittingTask(false);
    }
  };

  useEffect(() => {
    if (trackingStrategy !== "polling-only") {
      return;
    }

    clearPollingTimer();
    clearPollingElapsedTimer();

    if (!taskId || !autoPolling || !isActiveTaskStatus(taskStatus)) {
      return;
    }

    pollingElapsedTimerRef.current = resolvedDeps.setIntervalFn(() => {
      setPollingElapsedSeconds((previous) => previous + 1);
    }, ELAPSED_TICK_MS);

    pollingTimerRef.current = resolvedDeps.setIntervalFn(() => {
      void refreshTaskStatus();
    }, pollingIntervalMs);

    return () => {
      clearPollingTimer();
      clearPollingElapsedTimer();
    };
  }, [autoPolling, pollingIntervalMs, resolvedDeps, taskId, taskStatus, trackingStrategy]);

  useEffect(() => {
    return () => {
      clearPollingTimer();
      clearPollingElapsedTimer();
    };
  }, []);

  const trackingMode = trackingStrategy === "stream-first"
    ? streamTrackingMode
    : (taskId && autoPolling && isActiveTaskStatus(taskStatus) ? "polling" : "idle");
  const elapsedSeconds = trackingStrategy === "stream-first"
    ? streamElapsedSeconds
    : pollingElapsedSeconds;
  const isTracking = trackingMode !== "idle";

  return {
    taskId,
    taskStatus,
    applyTaskStatus: setTaskStatus,
    taskStatusLabel: toTaskStatusLabel(taskStatus),
    submittingTask,
    taskError,
    deduplicatedSubmit,
    autoPolling,
    setAutoPolling,
    trackingMode,
    elapsedSeconds,
    isTracking,
    submitTaskCode,
    submitTaskRequest,
    refreshTaskStatus,
  };
}
