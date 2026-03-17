import { useEffect } from "react";

import {
  isDeleteShortcut,
  isEditableEventTarget,
  isRedoShortcut,
  isUndoShortcut,
} from "./circuit-hotkeys";

interface UseCircuitCanvasHotkeysOptions {
  readonly selectedOperationId: string | null;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onDeleteSelected: () => void;
}

export function useCircuitCanvasHotkeys({
  selectedOperationId,
  onUndo,
  onRedo,
  onDeleteSelected,
}: UseCircuitCanvasHotkeysOptions) {
  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (isEditableEventTarget(event.target)) {
        return;
      }
      if (isUndoShortcut(event)) {
        event.preventDefault();
        onUndo();
        return;
      }
      if (isRedoShortcut(event)) {
        event.preventDefault();
        onRedo();
        return;
      }
      if (isDeleteShortcut(event)) {
        event.preventDefault();
        if (!selectedOperationId) {
          return;
        }
        onDeleteSelected();
      }
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [onDeleteSelected, onRedo, onUndo, selectedOperationId]);
}
