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
      style={{
        border: "1px solid color-mix(in srgb, var(--border-subtle) 45%, var(--accent-danger))",
        background: "color-mix(in srgb, var(--surface-panel) 84%, var(--accent-danger))",
        padding: 12,
        borderRadius: 8,
      }}
    >
      <strong style={{ color: "var(--accent-danger)" }}>{localized.title}</strong>
      <p style={{ margin: "6px 0 0 0" }}>{localized.detail}</p>
      <p style={{ margin: "6px 0 0 0", color: "var(--text-muted)" }}>
        {WORKBENCH_COPY.qasmErrorPanel.code}: {error.code} · 列: {error.column}
      </p>
      {localized.suggestion ? (
        <p data-testid="qasm-fix-suggestion" style={{ margin: "6px 0 0 0", color: "var(--text-secondary)" }}>
          {WORKBENCH_COPY.qasmErrorPanel.suggestion}: {localized.suggestion}
        </p>
      ) : null}
      <pre style={{ margin: "8px 0 0 0", whiteSpace: "pre-wrap" }}>{error.excerpt}</pre>
    </section>
  );
}

export default QasmErrorPanel;
