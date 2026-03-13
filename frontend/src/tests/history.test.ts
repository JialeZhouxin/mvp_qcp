import { describe, expect, it } from "vitest";

import {
  canRedoHistory,
  canUndoHistory,
  createHistoryState,
  pushHistoryState,
  redoHistoryState,
  undoHistoryState,
} from "../features/circuit/model/history";

describe("history service", () => {
  it("pushes state and clears future", () => {
    const initial = createHistoryState("a");
    const pushed = pushHistoryState(initial, "b");
    const undone = undoHistoryState(pushed);
    const rebuilt = pushHistoryState(undone, "c");

    expect(rebuilt.past).toEqual(["a"]);
    expect(rebuilt.present).toBe("c");
    expect(rebuilt.future).toEqual([]);
  });

  it("does not push equivalent states", () => {
    const initial = createHistoryState({ value: 1 });
    const pushed = pushHistoryState(initial, { value: 1 }, {
      equals: (left, right) => left.value === right.value,
    });

    expect(pushed).toBe(initial);
  });

  it("supports undo and redo with boundaries", () => {
    const state1 = createHistoryState(1);
    const state2 = pushHistoryState(state1, 2);
    const state3 = pushHistoryState(state2, 3);
    const undone = undoHistoryState(state3);
    const redone = redoHistoryState(undone);

    expect(canUndoHistory(state1)).toBe(false);
    expect(canUndoHistory(state3)).toBe(true);
    expect(canRedoHistory(state3)).toBe(false);
    expect(undone.present).toBe(2);
    expect(canRedoHistory(undone)).toBe(true);
    expect(redone.present).toBe(3);
  });
});
