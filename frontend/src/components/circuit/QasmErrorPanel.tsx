import type { QasmParseError } from "../../features/circuit/qasm/qasm-errors";

interface QasmErrorPanelProps {
  readonly error: QasmParseError | null;
}

function QasmErrorPanel({ error }: QasmErrorPanelProps) {
  if (!error) {
    return (
      <section style={{ border: "1px solid #d9f7be", background: "#f6ffed", padding: 12, borderRadius: 8 }}>
        <strong style={{ color: "#389e0d" }}>QASM 校验通过</strong>
      </section>
    );
  }

  return (
    <section style={{ border: "1px solid #ffccc7", background: "#fff2f0", padding: 12, borderRadius: 8 }}>
      <strong style={{ color: "#cf1322" }}>QASM 解析错误</strong>
      <p style={{ margin: "6px 0 0 0" }}>
        {error.code} | line {error.line}: {error.message}
      </p>
      <pre style={{ margin: "8px 0 0 0", whiteSpace: "pre-wrap" }}>{error.excerpt}</pre>
    </section>
  );
}

export default QasmErrorPanel;
