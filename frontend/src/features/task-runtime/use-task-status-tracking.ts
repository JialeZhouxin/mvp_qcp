import { useEffect, useRef, useState } from "react";

import type { TaskStatusResponse } from "../../api/tasks";
import type {
  HybridIterationStreamEvent,
  TaskStreamCallbacks,
  TaskStreamConnection,
} from "../../api/task-stream";
import {
  isActiveTaskStatus,
  isTerminalTaskStatus,
  toTaskStatusLabel,
} from "../../lib/task-status";

const POLLING_INTERVAL_MS = 3000;
const ELAPSED_TICK_MS = 1000;

export type TaskTrackingMode = "idle" | "sse" | "polling";

interface TimerDeps {
  readonly setIntervalFn: (handler: TimerHandler, timeout?: number) => number;
  readonly clearIntervalFn: (handle: number) => void;
}

export interface TaskStatusTrackingDeps extends TimerDeps {
  readonly getTaskStatus: (taskId: number) => Promise<TaskStatusResponse>;
  readonly connectTaskStatusStream: (
    taskIds: number[] | null,
    callbacks: TaskStreamCallbacks,
  ) => TaskStreamConnection;
}

interface UseTaskStatusTrackingParams {
  readonly deps: TaskStatusTrackingDeps;
  readonly onStatusUpdated: (status: string) => void;
  readonly onStatusRefreshError: (error: unknown) => void;
  readonly onHybridIteration?: (event: HybridIterationStreamEvent) => void;
}

export { isActiveTaskStatus, toTaskStatusLabel };

export function useTaskStatusTracking({
  deps,
  onStatusUpdated,
  onStatusRefreshError,
  onHybridIteration,
}: UseTaskStatusTrackingParams) {
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
      deps.clearIntervalFn(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  const stopElapsedClock = () => {
    if (elapsedTimerRef.current !== null) {
      deps.clearIntervalFn(elapsedTimerRef.current);
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
    onStatusUpdated(status);
    if (isTerminalTaskStatus(status)) {
      stopTracking();
    }
  };

  const pollTaskStatus = async (taskId: number) => {
    try {
      const response = await deps.getTaskStatus(taskId);
      applyTaskStatus(response.status);
    } catch (error) {
      onStatusRefreshError(error);
    }
  };

  const startPolling = (taskId: number) => {
    if (trackedTaskIdRef.current !== taskId || !isActiveTaskStatus(latestStatusRef.current)) {
      return;
    }
    stopStream();
    stopPolling();
    setTrackingMode("polling");
    pollingTimerRef.current = deps.setIntervalFn(() => {
      void pollTaskStatus(taskId);
    }, POLLING_INTERVAL_MS);
    void pollTaskStatus(taskId);
  };

  const startElapsedClock = () => {
    stopElapsedClock();
    elapsedTimerRef.current = deps.setIntervalFn(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, ELAPSED_TICK_MS);
  };

  const startStreamTracking = (taskId: number) => {
    try {
      streamRef.current = deps.connectTaskStatusStream([taskId], {
        onStatus: (event) => {
          if (event.task_id !== taskId || trackedTaskIdRef.current !== taskId) {
            return;
          }
          applyTaskStatus(event.status);
        },
        onHybridIteration,
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
    return () => {
      stopStream();
      stopPolling();
      stopElapsedClock();
    };
  }, []);

  return {
    trackingMode,
    elapsedSeconds,
    applyTaskStatus,
    startTracking,
    stopTracking,
    resetTracking,
    pollTaskStatus,
  };
}
