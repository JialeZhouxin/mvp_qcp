import { act, renderHook } from "@testing-library/react";

import type { CircuitModel } from "../features/circuit/model/types";
import {
  clearWorkbenchDraft,
  loadWorkbenchDraft,
  saveWorkbenchDraft,
} from "../features/circuit/ui/draft-storage";
import { setWorkbenchGuideDismissed } from "../features/circuit/ui/guide-preference";
import { useWorkbenchDraftSync } from "../features/circuit/ui/use-workbench-draft-sync";
import { useWorkbenchGuideState } from "../features/circuit/ui/use-workbench-guide-state";

const MODEL: CircuitModel = {
  numQubits: 1,
  operations: [{ id: "draft-1", gate: "h", targets: [0], layer: 0 }],
};

describe("workbench draft and guide hooks", () => {
  beforeEach(() => {
    clearWorkbenchDraft();
    setWorkbenchGuideDismissed(false);
    window.localStorage.clear();
  });

  it("clears the saved draft on reset version change", () => {
    window.localStorage.setItem(
      "qcp.workbench.draft.v1",
      JSON.stringify({
        version: 1,
        circuit: MODEL,
        qasm: "OPENQASM 3;\nqubit[1] q;\nh q[0];",
        displayMode: "ALL",
        updatedAt: Date.now(),
      }),
    );

    const { rerender } = renderHook(
      ({ resetVersion }) =>
        useWorkbenchDraftSync({
          circuit: MODEL,
          qasm: "OPENQASM 3;\nqubit[1] q;\nh q[0];",
          displayMode: "FILTERED",
          simulationStep: 1,
          resetVersion,
        }),
      { initialProps: { resetVersion: 0 } },
    );

    rerender({ resetVersion: 1 });
    expect(window.localStorage.getItem("qcp.workbench.draft.v1")).toBeNull();
  });

  it("persists simulation step while remaining compatible with older drafts", () => {
    saveWorkbenchDraft({
      version: 1,
      circuit: MODEL,
      qasm: "OPENQASM 3;\nqubit[1] q;\nh q[0];",
      displayMode: "ALL",
      simulationStep: 0,
      updatedAt: Date.now(),
    });

    expect(loadWorkbenchDraft()).toEqual(
      expect.objectContaining({
        circuit: expect.objectContaining({
          numQubits: 1,
          operations: [expect.objectContaining({ id: "draft-1", gate: "h", layer: 0 })],
        }),
        displayMode: "ALL",
        simulationStep: 0,
      }),
    );

    window.localStorage.setItem(
      "qcp.workbench.draft.v1",
      JSON.stringify({
        version: 1,
        circuit: MODEL,
        qasm: "OPENQASM 3;\nqubit[1] q;\nh q[0];",
        displayMode: "FILTERED",
        updatedAt: Date.now(),
      }),
    );

    expect(loadWorkbenchDraft()).toEqual(
      expect.objectContaining({
        circuit: expect.objectContaining({
          numQubits: 1,
          operations: [expect.objectContaining({ id: "draft-1", gate: "h", layer: 0 })],
        }),
        displayMode: "FILTERED",
      }),
    );
    expect(loadWorkbenchDraft()?.simulationStep).toBeUndefined();
  });

  it("persists guide dismissal state", () => {
    const { result } = renderHook(() => useWorkbenchGuideState());

    expect(result.current.showGuide).toBe(true);

    act(() => {
      result.current.dismissGuide();
    });

    expect(result.current.showGuide).toBe(false);
    expect(window.localStorage.getItem("qcp.workbench.guide.dismissed.v1")).toBe("1");
  });
});
