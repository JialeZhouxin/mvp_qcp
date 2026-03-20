import CircuitWorkbenchScreen from "../features/circuit/ui/CircuitWorkbenchScreen";

interface CircuitWorkbenchPageProps {
  readonly scheduler?: {
    readonly schedule: (model: unknown) => Promise<{ requestId: string; probabilities: Record<string, number> }>;
  };
}

function CircuitWorkbenchPage({ scheduler }: CircuitWorkbenchPageProps) {
  return <CircuitWorkbenchScreen scheduler={scheduler} />;
}

export default CircuitWorkbenchPage;
