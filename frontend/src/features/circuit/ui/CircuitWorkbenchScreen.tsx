import { type SimulationSchedulerLike } from "../simulation/use-workbench-simulation";
import CircuitWorkbenchLayout from "./CircuitWorkbenchLayout";
import { useCircuitWorkbenchController } from "./use-circuit-workbench-controller";

interface CircuitWorkbenchScreenProps {
  readonly scheduler?: SimulationSchedulerLike;
}

function CircuitWorkbenchScreen({ scheduler }: CircuitWorkbenchScreenProps) {
  const state = useCircuitWorkbenchController({ scheduler });

  return <CircuitWorkbenchLayout state={state} />;
}

export default CircuitWorkbenchScreen;
