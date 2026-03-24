import type { CircuitModel } from "../model/types";
import { simulateCircuit } from "./simulation-core";

export interface SimulationWorkerRequest {
  readonly requestId: string;
  readonly model: CircuitModel;
  readonly executionGateCount?: number;
}

export interface SimulationWorkerResult {
  readonly type: "result";
  readonly requestId: string;
  readonly probabilities: Record<string, number>;
}

export interface SimulationWorkerError {
  readonly type: "error";
  readonly requestId: string;
  readonly code: "SIM_EXEC_ERROR";
  readonly message: string;
}

export type SimulationWorkerResponse = SimulationWorkerResult | SimulationWorkerError;

function executeRequest(request: SimulationWorkerRequest): SimulationWorkerResponse {
  try {
    return {
      type: "result",
      requestId: request.requestId,
      probabilities: simulateCircuit(request.model, request.executionGateCount),
    };
  } catch (error) {
    return {
      type: "error",
      requestId: request.requestId,
      code: "SIM_EXEC_ERROR",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

if (typeof self !== "undefined") {
  const workerGlobal = self as unknown as {
    onmessage: ((event: MessageEvent<SimulationWorkerRequest>) => void) | null;
    postMessage: (data: SimulationWorkerResponse) => void;
  };
  workerGlobal.onmessage = (event: MessageEvent<SimulationWorkerRequest>) => {
    workerGlobal.postMessage(executeRequest(event.data));
  };
}

export { executeRequest };
