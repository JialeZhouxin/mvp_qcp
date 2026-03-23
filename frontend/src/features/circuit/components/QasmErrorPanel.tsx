import type { QasmParseError } from "../qasm/qasm-errors";
import { WORKBENCH_COPY } from "../ui/copy-catalog";
import { toQasmErrorMessage } from "../ui/message-catalog";

interface QasmErrorPanelProps {
  readonly error: QasmParseError | null;
}

function QasmErrorPanel({ error }: QasmErrorPanelProps) {
  if (!error) {
    return null;
  }

  const localized = toQasmErrorMessage(error);
  return (
    <section
      style={{ border: "1px solid #ffccc7", background: "#fff2f0", padding: 12, borderRadius: 8 }}
    >
      <strong style={{ color: "#cf1322" }}>{localized.title}</strong>
      <p style={{ margin: "6px 0 0 0" }}>{localized.detail}</p>
      <p style={{ margin: "6px 0 0 0", color: "#8c8c8c" }}>
        {WORKBENCH_COPY.qasmErrorPanel.code}: {error.code}，{WORKBENCH_COPY.qasmErrorPanel.column}:{" "}
        {error.column}
      </p>
      {localized.suggestion ? (
        <p data-testid="qasm-fix-suggestion" style={{ margin: "6px 0 0 0", color: "#595959" }}>
          {WORKBENCH_COPY.qasmErrorPanel.suggestion}: {localized.suggestion}
        </p>
      ) : null}
      <pre style={{ margin: "8px 0 0 0", whiteSpace: "pre-wrap" }}>{error.excerpt}</pre>
    </section>
  );
}

export default QasmErrorPanel;

