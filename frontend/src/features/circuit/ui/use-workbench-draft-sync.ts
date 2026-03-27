import { useEffect, useRef } from "react";

import type { CircuitModel } from "../model/types";
import type { ProbabilityDisplayMode } from "../simulation/probability-filter";
import { clearWorkbenchDraft, saveWorkbenchDraft } from "./draft-storage";

interface UseWorkbenchDraftSyncParams {
  readonly circuit: CircuitModel;
  readonly qasm: string;
  readonly displayMode: ProbabilityDisplayMode;
  readonly simulationStep: number;
  readonly resetVersion: number;
}

export function useWorkbenchDraftSync({
  circuit,
  qasm,
  displayMode,
  simulationStep,
  resetVersion,
}: UseWorkbenchDraftSyncParams) {
  const skipNextSaveRef = useRef(true);
  const previousResetVersionRef = useRef(resetVersion);

  useEffect(() => {
    if (previousResetVersionRef.current === resetVersion) {
      return;
    }
    previousResetVersionRef.current = resetVersion;
    skipNextSaveRef.current = true;
    clearWorkbenchDraft();
  }, [resetVersion]);

  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    saveWorkbenchDraft({
      version: 1,
      circuit,
      qasm,
      displayMode,
      simulationStep,
      updatedAt: Date.now(),
    });
  }, [circuit, qasm, displayMode, simulationStep]);
}
