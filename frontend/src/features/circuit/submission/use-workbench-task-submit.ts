import { useEffect, useState } from "react";

import {
  useTaskRuntime,
  type UseTaskRuntimeDeps,
} from "../../task-runtime/use-task-runtime";
import { validateCircuitModel } from "../model/circuit-validation";
import type { CircuitModel } from "../model/types";
import type { QasmParseError } from "../qasm/qasm-errors";
import {
  buildIdempotencyKey,
  buildQiboTaskCode,
  buildSubmitFingerprint,
} from "./circuit-task-submit";

const SUBMIT_PARSE_ERROR_HINT = "QASM \u89e3\u6790\u5931\u8d25\uff0c\u8bf7\u5148\u4fee\u590d\u540e\u518d\u63d0\u4ea4\u3002";
const STATUS_REFRESH_ERROR_HINT = "\u5237\u65b0\u4efb\u52a1\u72b6\u6001\u5931\u8d25";
const TASK_SUBMIT_ERROR_HINT = "\u4efb\u52a1\u63d0\u4ea4\u5931\u8d25";
const VALIDATION_ERROR_PREFIX = "\u7535\u8def\u6821\u9a8c\u5931\u8d25\uff1a";

export interface UseWorkbenchTaskSubmitDeps extends UseTaskRuntimeDeps {}

interface UseWorkbenchTaskSubmitParams {
  readonly circuit: CircuitModel;
  readonly parseError: QasmParseError | null;
  readonly deps?: Partial<UseWorkbenchTaskSubmitDeps>;
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
    return `${VALIDATION_ERROR_PREFIX}${validation.error.message}`;
  }
  return null;
}

export function useWorkbenchTaskSubmit({ circuit, parseError, deps }: UseWorkbenchTaskSubmitParams) {
  const [blockedSubmitError, setBlockedSubmitError] = useState<string | null>(null);
  const {
    taskId,
    taskStatus,
    taskStatusLabel,
    submittingTask,
    taskError,
    deduplicatedSubmit,
    trackingMode,
    isTracking,
    elapsedSeconds,
    submitTaskCode,
    refreshTaskStatus,
  } = useTaskRuntime({
    deps,
    trackingStrategy: "stream-first",
    submitErrorHint: TASK_SUBMIT_ERROR_HINT,
    statusRefreshErrorHint: STATUS_REFRESH_ERROR_HINT,
  });

  useEffect(() => {
    if (parseError) {
      setBlockedSubmitError(SUBMIT_PARSE_ERROR_HINT);
      return;
    }
    setBlockedSubmitError((previous) => (previous === SUBMIT_PARSE_ERROR_HINT ? null : previous));
  }, [parseError]);

  async function onSubmitTask() {
    const blockedReason = resolveSubmitBlockReason(circuit, parseError);
    if (blockedReason) {
      setBlockedSubmitError(blockedReason);
      return;
    }

    setBlockedSubmitError(null);
    const generatedCode = buildQiboTaskCode(circuit);
    const fingerprint = buildSubmitFingerprint(circuit);
    const idempotencyKey = buildIdempotencyKey(fingerprint);
    await submitTaskCode(generatedCode, { idempotencyKey });
  }

  async function onRefreshTaskStatus() {
    setBlockedSubmitError(null);
    await refreshTaskStatus();
  }

  return {
    submittingTask,
    submittedTaskId: taskId,
    submittedTaskStatus: taskStatus,
    taskStatusLabel,
    submitError: blockedSubmitError ?? taskError,
    deduplicatedSubmit,
    canSubmit: parseError === null,
    trackingMode,
    isTracking,
    elapsedSeconds,
    onSubmitTask,
    onRefreshTaskStatus,
  };
}
