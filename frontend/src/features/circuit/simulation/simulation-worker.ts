import type { CircuitModel } from "../model/types";
import { simulateCircuitAnalysis, type BlochVector } from "./simulation-core";

export interface SimulationWorkerRequest {
  readonly requestId: string;
  readonly model: CircuitModel;
}

export interface SimulationWorkerResult {
  readonly type: "result";
  readonly requestId: string;
  readonly probabilities: Record<string, number>;
  readonly blochVectors: readonly BlochVector[];
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
    const analysis = simulateCircuitAnalysis(request.model);
    return {
      type: "result",
      requestId: request.requestId,
      probabilities: analysis.probabilities,
      blochVectors: analysis.blochVectors,
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
