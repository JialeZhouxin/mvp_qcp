import { useEffect, useRef } from "react";

import type { CircuitModel } from "../../features/circuit/model/types";
import type { QasmParseError } from "../../features/circuit/qasm/qasm-errors";
import { fromQasm3 } from "../../features/circuit/qasm/qasm-bridge";

const DEFAULT_DEBOUNCE_MS = 200;

interface QasmEditorPaneProps {
  readonly value: string;
  readonly onValueChange: (next: string) => void;
  readonly onValidQasmChange: (nextModel: CircuitModel) => void;
  readonly onParseError: (error: QasmParseError | null) => void;
  readonly debounceMs?: number;
}

function QasmEditorPane({
  value,
  onValueChange,
  onValidQasmChange,
  onParseError,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: QasmEditorPaneProps) {
  const onValidQasmChangeRef = useRef(onValidQasmChange);
  const onParseErrorRef = useRef(onParseError);

  useEffect(() => {
    onValidQasmChangeRef.current = onValidQasmChange;
  }, [onValidQasmChange]);

  useEffect(() => {
    onParseErrorRef.current = onParseError;
  }, [onParseError]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const parsed = fromQasm3(value);
      if (parsed.ok) {
        onParseErrorRef.current(null);
        onValidQasmChangeRef.current(parsed.model);
        return;
      }
      onParseErrorRef.current(parsed.error);
    }, debounceMs);

    return () => window.clearTimeout(timerId);
  }, [value, debounceMs]);

  return (
    <section style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>OpenQASM 3</h3>
      <textarea
        data-testid="qasm-editor-input"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        style={{ width: "100%", minHeight: 260, fontFamily: "Consolas, monospace", fontSize: 14 }}
      />
    </section>
  );
}

export default QasmEditorPane;
