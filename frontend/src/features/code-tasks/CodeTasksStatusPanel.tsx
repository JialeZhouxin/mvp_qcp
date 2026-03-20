interface CodeTasksStatusPanelProps {
  readonly taskId: number | null;
  readonly status: string;
  readonly error: string | null;
  readonly diagnosticText: string | null;
}

function CodeTasksStatusPanel({
  taskId,
  status,
  error,
  diagnosticText,
}: CodeTasksStatusPanelProps) {
  return (
    <section style={{ marginTop: 16 }}>
      <p>Task ID: {taskId ?? "-"}</p>
      <p>Status: {status}</p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {diagnosticText ? <p style={{ color: "#cf1322" }}>{diagnosticText}</p> : null}
    </section>
  );
}

export default CodeTasksStatusPanel;
