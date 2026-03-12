import type { CircuitModel } from "../model/types";
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from "./simulation-worker";

function createSimulationWorker(): Worker {
  return new Worker(new URL("./simulation-worker.ts", import.meta.url), {
    type: "module",
  });
}

export function runSimulationRequest(
  requestId: string,
  model: CircuitModel,
): Promise<SimulationWorkerResponse> {
  return new Promise((resolve, reject) => {
    const worker = createSimulationWorker();

    const cleanup = () => {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };

    worker.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => {
      cleanup();
      resolve(event.data);
    };
    worker.onerror = (event: ErrorEvent) => {
      cleanup();
      reject(new Error(event.message || "simulation worker failed"));
    };

    const request: SimulationWorkerRequest = {
      requestId,
      model,
    };
    worker.postMessage(request);
  });
}

