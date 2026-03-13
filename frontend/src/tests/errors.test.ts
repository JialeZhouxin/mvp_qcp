import { describe, expect, it } from "vitest";

import { toErrorMessage } from "../api/errors";
import {
  toCanvasMessage,
  toQasmErrorMessage,
  toSimulationStateLabel,
} from "../features/circuit/ui/message-catalog";

describe("toErrorMessage", () => {
  it("returns error message when Error is provided", () => {
    const value = toErrorMessage(new Error("boom"), "fallback");
    expect(value).toBe("boom");
  });

  it("returns fallback for non-Error values", () => {
    const value = toErrorMessage("oops", "fallback");
    expect(value).toBe("fallback");
  });
});

describe("message catalog", () => {
  it("maps simulation state to chinese labels", () => {
    expect(toSimulationStateLabel("IDLE")).toBe("等待仿真");
    expect(toSimulationStateLabel("RUNNING")).toBe("仿真中...");
    expect(toSimulationStateLabel("READY")).toBe("结果已更新");
    expect(toSimulationStateLabel("ERROR")).toBe("仿真失败");
  });

  it("builds actionable canvas message", () => {
    const message = toCanvasMessage("CELL_OCCUPIED", { qubit: 1, layer: 3 });
    expect(message.title).toBe("无法放置量子门");
    expect(message.detail).toContain("q1");
    expect(message.suggestion).toContain("其他空白格");
  });

  it("maps qasm parse error to localized message", () => {
    const message = toQasmErrorMessage({
      code: "INVALID_SYNTAX",
      message: "missing ;",
      line: 2,
      column: 1,
      excerpt: "qubit[2] q",
    });
    expect(message.title).toBe("QASM 解析错误");
    expect(message.detail).toContain("第 2 行");
    expect(message.suggestion).toContain("分号");
  });
});
