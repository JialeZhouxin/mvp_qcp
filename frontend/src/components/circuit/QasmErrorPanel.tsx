import type { QasmParseError } from "../../features/circuit/qasm/qasm-errors";
import { toQasmErrorMessage } from "../../features/circuit/ui/message-catalog";

interface QasmErrorPanelProps {
  readonly error: QasmParseError | null;
}

function QasmErrorPanel({ error }: QasmErrorPanelProps) {
  if (!error) {
    return (
      <section
        style={{ border: "1px solid #d9f7be", background: "#f6ffed", padding: 12, borderRadius: 8 }}
      >
        <strong style={{ color: "#389e0d" }}>QASM 校验通过</strong>
      </section>
    );
  }

  const localized = toQasmErrorMessage(error);
  return (
    <section
      style={{ border: "1px solid #ffccc7", background: "#fff2f0", padding: 12, borderRadius: 8 }}
    >
      <strong style={{ color: "#cf1322" }}>{localized.title}</strong>
      <p style={{ margin: "6px 0 0 0" }}>{localized.detail}</p>
      <p style={{ margin: "6px 0 0 0", color: "#8c8c8c" }}>
        错误码: {error.code}，列: {error.column}
      </p>
      {localized.suggestion ? (
        <p data-testid="qasm-fix-suggestion" style={{ margin: "6px 0 0 0", color: "#595959" }}>
          建议: {localized.suggestion}
        </p>
      ) : null}
      <pre style={{ margin: "8px 0 0 0", whiteSpace: "pre-wrap" }}>{error.excerpt}</pre>
    </section>
  );
}

export default QasmErrorPanel;
