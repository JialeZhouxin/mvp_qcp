import { useMemo, useState, useEffect } from "react";

import { toErrorMessage } from "../../../api/errors";
import {
  getTaskStatus as getTaskStatusApi,
  submitTask as submitTaskApi,
  type TaskStatusResponse,
  type TaskSubmitResponse,
} from "../../../api/tasks";
import type { TaskStreamCallbacks, TaskStreamConnection } from "../../../api/task-stream";
import { subscribeTaskStream as connectTaskStatusStreamApi } from "../../../api/task-stream";
import { validateCircuitModel } from "../model/circuit-validation";
import type { CircuitModel } from "../model/types";
import type { QasmParseError } from "../qasm/qasm-errors";
import {
  buildIdempotencyKey,
  buildQiboTaskCode,
  buildSubmitFingerprint,
} from "./circuit-task-submit";
import {
  isActiveTaskStatus,
  toTaskStatusLabel,
  type TaskTrackingMode,
  type TaskStatusTrackingDeps,
  useTaskStatusTracking,
} from "./use-task-status-tracking";

const SUBMIT_PARSE_ERROR_HINT = "QASM 解析失败，请先修复后再提交。";
const STATUS_REFRESH_ERROR_HINT = "任务状态刷新失败";
const TASK_SUBMIT_ERROR_HINT = "任务提交失败";

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
  const trackingDeps = resolvedDeps as TaskStatusTrackingDeps;

  const [submittingTask, setSubmittingTask] = useState(false);
  const [submittedTaskId, setSubmittedTaskId] = useState<number | null>(null);
  const [submittedTaskStatus, setSubmittedTaskStatus] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deduplicatedSubmit, setDeduplicatedSubmit] = useState(false);

  const {
    trackingMode,
    elapsedSeconds,
    applyTaskStatus,
    startTracking,
    stopTracking,
    resetTracking,
    pollTaskStatus,
  } = useTaskStatusTracking({
    deps: trackingDeps,
    onStatusUpdated: setSubmittedTaskStatus,
    onStatusRefreshError: (error) => {
      setSubmitError(toErrorMessage(error, STATUS_REFRESH_ERROR_HINT));
    },
  });

  useEffect(() => {
    if (parseError) {
      setSubmitError(SUBMIT_PARSE_ERROR_HINT);
      return;
    }
    setSubmitError((previous) => (previous === SUBMIT_PARSE_ERROR_HINT ? null : previous));
  }, [parseError]);

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
      await pollTaskStatus(submittedTaskId);
    } catch {
      // errors are handled in useTaskStatusTracking via onStatusRefreshError callback
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
    trackingMode: trackingMode as TaskTrackingMode,
    isTracking: isActiveTaskStatus(submittedTaskStatus) && trackingMode !== "idle",
    elapsedSeconds,
    onSubmitTask,
    onRefreshTaskStatus,
  };
}
