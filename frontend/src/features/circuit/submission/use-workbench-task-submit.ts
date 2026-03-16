import { useEffect, useState } from "react";

import { toErrorMessage } from "../../../api/errors";
import { getTaskStatus, submitTask } from "../../../api/tasks";
import { validateCircuitModel } from "../model/circuit-validation";
import type { CircuitModel } from "../model/types";
import type { QasmParseError } from "../qasm/qasm-errors";
import {
  buildIdempotencyKey,
  buildQiboTaskCode,
  buildSubmitFingerprint,
} from "./circuit-task-submit";

const SUBMIT_PARSE_ERROR_HINT = "QASM 解析失败，请先修复后再提交。";

interface UseWorkbenchTaskSubmitParams {
  readonly circuit: CircuitModel;
  readonly parseError: QasmParseError | null;
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

export function useWorkbenchTaskSubmit({ circuit, parseError }: UseWorkbenchTaskSubmitParams) {
  const [submittingTask, setSubmittingTask] = useState(false);
  const [submittedTaskId, setSubmittedTaskId] = useState<number | null>(null);
  const [submittedTaskStatus, setSubmittedTaskStatus] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deduplicatedSubmit, setDeduplicatedSubmit] = useState(false);

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
    try {
      const generatedCode = buildQiboTaskCode(circuit);
      const fingerprint = buildSubmitFingerprint(circuit);
      const idempotencyKey = buildIdempotencyKey(fingerprint);
      const response = await submitTask(generatedCode, { idempotencyKey });
      setSubmittedTaskId(response.task_id);
      setSubmittedTaskStatus(response.status);
      setDeduplicatedSubmit(response.deduplicated === true);
    } catch (error) {
      setSubmitError(toErrorMessage(error, "任务提交失败"));
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
      const response = await getTaskStatus(submittedTaskId);
      setSubmittedTaskStatus(response.status);
    } catch (error) {
      setSubmitError(toErrorMessage(error, "任务状态刷新失败"));
    }
  }

  return {
    submittingTask,
    submittedTaskId,
    submittedTaskStatus,
    submitError,
    deduplicatedSubmit,
    canSubmit: parseError === null,
    onSubmitTask,
    onRefreshTaskStatus,
  };
}
