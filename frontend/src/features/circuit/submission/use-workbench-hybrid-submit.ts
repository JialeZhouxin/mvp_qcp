import { useEffect, useMemo, useState } from "react";

import {
  cancelTask,
  submitHybridTask,
  type HybridTaskSubmitRequest,
  type TaskSubmitResponse,
} from "../../../api/tasks";
import { useTaskRuntime, type UseTaskRuntimeDeps } from "../../task-runtime";
import { buildIdempotencyKey } from "./circuit-task-submit";

const HYBRID_SUBMIT_ERROR_HINT = "混合实验提交失败";
const HYBRID_REFRESH_ERROR_HINT = "混合实验状态刷新失败";

export interface HybridIterationPoint {
  readonly iteration: number;
  readonly objective: number;
  readonly bestObjective: number;
  readonly currentBestGap: number;
  readonly updatedAt: string;
}

export interface HybridConfigState {
  readonly maxIterations: number;
  readonly stepSize: number;
  readonly tolerance: number;
}

interface UseWorkbenchHybridSubmitParams {
  readonly numQubits: number;
  readonly deps?: Partial<UseTaskRuntimeDeps>;
}

interface UseWorkbenchHybridSubmitResult {
  readonly config: HybridConfigState;
  readonly setMaxIterations: (value: number) => void;
  readonly setStepSize: (value: number) => void;
  readonly setTolerance: (value: number) => void;
  readonly submittingTask: boolean;
  readonly submittedTaskId: number | null;
  readonly submittedTaskStatus: string | null;
  readonly taskStatusLabel: string;
  readonly submitError: string | null;
  readonly deduplicatedSubmit: boolean;
  readonly canSubmit: boolean;
  readonly elapsedSeconds: number;
  readonly canCancel: boolean;
  readonly iterations: readonly HybridIterationPoint[];
  readonly iterationCount: number;
  readonly latestObjective: number | null;
  readonly bestObjective: number | null;
  readonly latestCurrentBestGap: number | null;
  readonly onSubmitHybrid: () => Promise<void>;
  readonly onCancelHybrid: () => Promise<void>;
}

export function useWorkbenchHybridSubmit({
  numQubits,
  deps,
}: UseWorkbenchHybridSubmitParams): UseWorkbenchHybridSubmitResult {
  const [maxIterations, setMaxIterations] = useState(20);
  const [stepSize, setStepSize] = useState(0.2);
  const [tolerance, setTolerance] = useState(0.001);
  const [targetBitstring, setTargetBitstring] = useState("00");
  const [iterations, setIterations] = useState<HybridIterationPoint[]>([]);
  const {
    taskId,
    taskStatus,
    taskStatusLabel,
    submittingTask,
    taskError,
    deduplicatedSubmit,
    isTracking,
    elapsedSeconds,
    submitTaskRequest,
    applyTaskStatus,
  } = useTaskRuntime({
    deps,
    trackingStrategy: "stream-first",
    submitErrorHint: HYBRID_SUBMIT_ERROR_HINT,
    statusRefreshErrorHint: HYBRID_REFRESH_ERROR_HINT,
    onHybridIteration: (event) => {
      setIterations((previous) => {
        const byIteration = new Map(previous.map((point) => [point.iteration, point]));
        byIteration.set(event.iteration, {
          iteration: event.iteration,
          objective: event.objective,
          bestObjective: event.best_objective,
          currentBestGap:
            event.current_best_gap ?? Math.max(0, event.objective - event.best_objective),
          updatedAt: event.updated_at,
        });
        return Array.from(byIteration.values()).sort((left, right) => left.iteration - right.iteration);
      });
    },
  });

  useEffect(() => {
    const resolved = Math.max(1, Math.min(8, numQubits));
    setTargetBitstring("0".repeat(resolved));
  }, [numQubits]);

  const latestObjective = iterations.length > 0 ? iterations[iterations.length - 1].objective : null;
  const bestObjective = iterations.length > 0 ? iterations[iterations.length - 1].bestObjective : null;
  const latestCurrentBestGap =
    iterations.length > 0 ? iterations[iterations.length - 1].currentBestGap : null;
  const iterationCount = iterations.length > 0 ? iterations[iterations.length - 1].iteration : 0;

  const canCancel = Boolean(taskId) && isTracking && taskStatus !== "CANCELLED";
  const canSubmit = useMemo(
    () =>
      maxIterations >= 1 &&
      maxIterations <= 10000 &&
      stepSize > 0 &&
      tolerance > 0 &&
      targetBitstring.length > 0,
    [maxIterations, stepSize, targetBitstring.length, tolerance],
  );

  async function onSubmitHybrid() {
    if (!canSubmit) {
      return;
    }
    const payload: HybridTaskSubmitRequest = {
      algorithm: "vqe",
      problem_template: "bell_state_overlap",
      max_iterations: maxIterations,
      step_size: stepSize,
      tolerance,
      target_bitstring: targetBitstring,
      num_qubits: targetBitstring.length,
    };
    const idempotencyKey = buildIdempotencyKey(JSON.stringify(payload));
    setIterations([]);
    await submitTaskRequest(() =>
      submitHybridTask(payload, { idempotencyKey }) as Promise<TaskSubmitResponse>,
    );
  }

  async function onCancelHybrid() {
    if (!taskId) {
      return;
    }
    await cancelTask(taskId);
    applyTaskStatus("CANCELLED");
  }

  return {
    config: {
      maxIterations,
      stepSize,
      tolerance,
    },
    setMaxIterations: (value) => setMaxIterations(Math.max(1, Math.min(10000, Math.trunc(value)))),
    setStepSize: (value) => setStepSize(Math.max(0.0001, Number(value))),
    setTolerance: (value) => setTolerance(Math.max(0.000001, Number(value))),
    submittingTask,
    submittedTaskId: taskId,
    submittedTaskStatus: taskStatus,
    taskStatusLabel,
    submitError: taskError,
    deduplicatedSubmit,
    canSubmit,
    elapsedSeconds,
    canCancel,
    iterations,
    iterationCount,
    latestObjective,
    bestObjective,
    latestCurrentBestGap,
    onSubmitHybrid,
    onCancelHybrid,
  };
}
