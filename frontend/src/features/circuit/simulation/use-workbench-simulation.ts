import { useEffect, useMemo } from "react";
import { useState } from "react";

import { evaluateComplexity, getLocalSimulationGuardMessage } from "../model/complexity-guard";
import { validateCircuitModel } from "../model/circuit-validation";
import type { CircuitModel } from "../model/types";
import {
  filterProbabilities,
  getProbabilityDisplayView,
  type ProbabilityDisplayMode,
  type ProbabilityFilterResult,
} from "./probability-filter";
import { SimulationScheduleError, createSimulationScheduler } from "./scheduler";

export type SimulationViewState = "IDLE" | "RUNNING" | "READY" | "ERROR";

export interface SimulationSchedulerLike {
  readonly schedule: (
    model: CircuitModel,
  ) => Promise<{ requestId: string; probabilities: Record<string, number> }>;
}

interface UseWorkbenchSimulationParams {
  readonly circuit: CircuitModel;
  readonly displayMode: ProbabilityDisplayMode;
  readonly scheduler?: SimulationSchedulerLike;
}

export function useWorkbenchSimulation({
  circuit,
  displayMode,
  scheduler,
}: UseWorkbenchSimulationParams) {
  const resolvedScheduler = useMemo<SimulationSchedulerLike>(
    () => scheduler ?? createSimulationScheduler(),
    [scheduler],
  );
  const [simulationState, setSimulationState] = useState<SimulationViewState>("IDLE");
  const [simError, setSimError] = useState<string | null>(null);
  const [probabilityView, setProbabilityView] = useState<ProbabilityFilterResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    const runSimulation = async () => {
      setSimulationState("RUNNING");
      const validation = validateCircuitModel(circuit);
      if (!validation.ok) {
        if (cancelled) {
          return;
        }
        setSimError(`ç”µè·¯æ ¡éªŒå¤±è´¥ï¼š${validation.error.message}`);
        setProbabilityView(null);
        setSimulationState("ERROR");
        return;
      }

      const simGuardMessage = getLocalSimulationGuardMessage(circuit);
      if (simGuardMessage) {
        if (cancelled) {
          return;
        }
        setSimError(simGuardMessage);
        setProbabilityView(null);
        setSimulationState("ERROR");
        return;
      }

      const complexity = evaluateComplexity(circuit);
      if (!complexity.ok) {
        if (cancelled) {
          return;
        }
        setSimError(`æœ¬åœ°æ¨¡æ‹Ÿå¤æ‚åº¦è¿‡é«˜${complexity.message ?? ""}`.trim());
        setProbabilityView(null);
        setSimulationState("ERROR");
        return;
      }

      try {
        const response = await resolvedScheduler.schedule(circuit);
        if (cancelled) {
          return;
        }
        setProbabilityView(filterProbabilities(circuit.numQubits, response.probabilities));
        setSimError(null);
        setSimulationState("READY");
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof SimulationScheduleError && error.code === "SIM_STALE") {
          return;
        }
        setSimError(`æœ¬åœ°æ¨¡æ‹Ÿå¤±è´¥ï¼š${error instanceof Error ? error.message : String(error)}`);
        setProbabilityView(null);
        setSimulationState("ERROR");
      }
    };

    void runSimulation();
    return () => {
      cancelled = true;
    };
  }, [circuit, resolvedScheduler]);

  const probabilityDisplayView = probabilityView
    ? getProbabilityDisplayView(displayMode, probabilityView)
    : null;
  const epsilonText = probabilityView ? probabilityView.epsilon.toExponential(3) : "--";

  return {
    simulationState,
    simError,
    probabilityView,
    probabilityDisplayView,
    epsilonText,
  };
}
