import { act, renderHook } from "@testing-library/react";

import type { CircuitModel } from "../features/circuit/model/types";
import { clearWorkbenchDraft } from "../features/circuit/ui/draft-storage";
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

  it("restores saved draft on mount and clears it on reset version change", () => {
    const restore = vi.fn();
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
          resetVersion,
          onRestore: restore,
        }),
      { initialProps: { resetVersion: 0 } },
    );

    expect(restore).toHaveBeenCalledWith({
      circuit: MODEL,
      qasm: "OPENQASM 3;\nqubit[1] q;\nh q[0];",
      displayMode: "ALL",
    });

    rerender({ resetVersion: 1 });
    expect(window.localStorage.getItem("qcp.workbench.draft.v1")).toBeNull();
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
