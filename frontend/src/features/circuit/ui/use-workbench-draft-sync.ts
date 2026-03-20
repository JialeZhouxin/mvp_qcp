import { useEffect, useRef } from "react";

import type { ProbabilityDisplayMode } from "../simulation/probability-filter";
import type { CircuitModel } from "../model/types";
import { clearWorkbenchDraft, loadWorkbenchDraft, saveWorkbenchDraft } from "./draft-storage";

interface WorkbenchDraftRestorePayload {
  readonly circuit: CircuitModel;
  readonly qasm: string;
  readonly displayMode: ProbabilityDisplayMode;
}

interface UseWorkbenchDraftSyncParams {
  readonly circuit: CircuitModel;
  readonly qasm: string;
  readonly displayMode: ProbabilityDisplayMode;
  readonly resetVersion: number;
  readonly onRestore: (payload: WorkbenchDraftRestorePayload) => void;
}

export function useWorkbenchDraftSync({
  circuit,
  qasm,
  displayMode,
  resetVersion,
  onRestore,
}: UseWorkbenchDraftSyncParams) {
  const restoredRef = useRef(false);
  const skipNextSaveRef = useRef(true);
  const previousResetVersionRef = useRef(resetVersion);

  useEffect(() => {
    if (restoredRef.current) {
      return;
    }
    restoredRef.current = true;
    const draft = loadWorkbenchDraft();
    if (!draft) {
      return;
    }
    onRestore({
      circuit: draft.circuit,
      qasm: draft.qasm,
      displayMode: draft.displayMode,
    });
  }, [onRestore]);

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
      updatedAt: Date.now(),
    });
  }, [circuit, qasm, displayMode]);
}
