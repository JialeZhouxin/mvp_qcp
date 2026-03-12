import type { CircuitModel } from "../model/types";
import { runSimulationRequest } from "./simulation-client";
import type { SimulationWorkerResponse } from "./simulation-worker";

export type SimulationScheduleErrorCode =
  | "SIM_STALE"
  | "SIM_TIMEOUT"
  | "SIM_EXEC_ERROR";

export class SimulationScheduleError extends Error {
  readonly code: SimulationScheduleErrorCode;

  constructor(code: SimulationScheduleErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export interface ScheduledSimulationResult {
  readonly requestId: string;
  readonly probabilities: Record<string, number>;
}

type SimulationRunner = (
  requestId: string,
  model: CircuitModel,
) => Promise<SimulationWorkerResponse>;

interface SchedulerOptions {
  readonly debounceMs?: number;
  readonly timeoutMs?: number;
  readonly runner?: SimulationRunner;
}

interface PendingRun {
  readonly timerId: number;
  readonly reject: (reason?: unknown) => void;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new SimulationScheduleError("SIM_TIMEOUT", "simulation timed out"));
    }, timeoutMs);

    promise.then(
      (result) => {
        window.clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function createStaleError(): SimulationScheduleError {
  return new SimulationScheduleError(
    "SIM_STALE",
    "simulation request became stale",
  );
}

function toExecutionError(error: unknown): SimulationScheduleError {
  if (error instanceof SimulationScheduleError) {
    return error;
  }
  return new SimulationScheduleError(
    "SIM_EXEC_ERROR",
    error instanceof Error ? error.message : String(error),
  );
}

export function createSimulationScheduler(options: SchedulerOptions = {}) {
  const debounceMs = options.debounceMs ?? 200;
  const timeoutMs = options.timeoutMs ?? 1000;
  const runner = options.runner ?? runSimulationRequest;
  let version = 0;
  let pending: PendingRun | null = null;

  const cancelPending = () => {
    if (!pending) {
      return;
    }
    window.clearTimeout(pending.timerId);
    pending.reject(createStaleError());
    pending = null;
  };

  const schedule = (model: CircuitModel): Promise<ScheduledSimulationResult> => {
    version += 1;
    const requestVersion = version;
    cancelPending();

    return new Promise((resolve, reject) => {
      const timerId = window.setTimeout(async () => {
        pending = null;
        try {
          const response = await withTimeout(
            runner(`sim-${requestVersion}`, model),
            timeoutMs,
          );
          if (requestVersion !== version) {
            reject(createStaleError());
            return;
          }
          if (response.type === "error") {
            reject(new SimulationScheduleError(response.code, response.message));
            return;
          }
          resolve({
            requestId: response.requestId,
            probabilities: response.probabilities,
          });
        } catch (error) {
          reject(toExecutionError(error));
        }
      }, debounceMs);
      pending = { timerId, reject };
    });
  };

  return { schedule };
}

