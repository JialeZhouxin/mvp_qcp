import { fireEvent, render, screen } from "@testing-library/react";

import QasmEditorPane from "../components/circuit/QasmEditorPane";
import type { QasmParseError } from "../features/circuit/qasm/qasm-errors";

const VALID_QASM = `OPENQASM 3;
qubit[1] q;
x q[0];
`;

describe("QasmEditorPane", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits valid model callback when qasm is valid", async () => {
    const onValidQasmChange = vi.fn();
    const onParseError = vi.fn();
    render(
      <QasmEditorPane
        value={VALID_QASM}
        onValueChange={vi.fn()}
        onValidQasmChange={onValidQasmChange}
        onParseError={onParseError}
        debounceMs={100}
      />,
    );

    await vi.advanceTimersByTimeAsync(120);
    expect(onValidQasmChange).toHaveBeenCalledTimes(1);
    expect(onParseError).toHaveBeenCalledWith(null);
  });

  it("reports parse error and does not emit valid callback when qasm is invalid", async () => {
    const onValidQasmChange = vi.fn();
    const onParseError = vi.fn();
    render(
      <QasmEditorPane
        value={"OPENQASM 3;\nqubit[1] q\nx q[0];"}
        onValueChange={vi.fn()}
        onValidQasmChange={onValidQasmChange}
        onParseError={onParseError}
        debounceMs={100}
      />,
    );

    await vi.advanceTimersByTimeAsync(120);
    expect(onValidQasmChange).not.toHaveBeenCalled();
    const firstError = onParseError.mock.calls[0][0] as QasmParseError;
    expect(firstError.code).toBe("INVALID_SYNTAX");
  });

  it("forwards textarea changes", () => {
    const onValueChange = vi.fn();
    render(
      <QasmEditorPane
        value={VALID_QASM}
        onValueChange={onValueChange}
        onValidQasmChange={vi.fn()}
        onParseError={vi.fn()}
        debounceMs={100}
      />,
    );

    fireEvent.change(screen.getByTestId("qasm-editor-input"), {
      target: { value: "OPENQASM 3;\nqubit[1] q;\nh q[0];\n" },
    });
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("does not emit duplicate valid callback for equivalent qasm", async () => {
    const onValidQasmChange = vi.fn();
    const onParseError = vi.fn();
    const view = render(
      <QasmEditorPane
        value={VALID_QASM}
        onValueChange={vi.fn()}
        onValidQasmChange={onValidQasmChange}
        onParseError={onParseError}
        debounceMs={100}
      />,
    );

    await vi.advanceTimersByTimeAsync(120);
    expect(onValidQasmChange).toHaveBeenCalledTimes(1);

    view.rerender(
      <QasmEditorPane
        value={`${VALID_QASM}\n`}
        onValueChange={vi.fn()}
        onValidQasmChange={onValidQasmChange}
        onParseError={onParseError}
        debounceMs={100}
      />,
    );
    await vi.advanceTimersByTimeAsync(120);
    expect(onValidQasmChange).toHaveBeenCalledTimes(1);
  });
});
