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
    <section className="tasks-theme-panel" style={{ marginTop: 16, padding: 12 }}>
      <p>Task ID: {taskId ?? "-"}</p>
      <p>Status: {status}</p>
      {error ? <p style={{ color: "var(--accent-danger)" }}>{error}</p> : null}
      {diagnosticText ? <p style={{ color: "var(--accent-danger)" }}>{diagnosticText}</p> : null}
    </section>
  );
}

export default CodeTasksStatusPanel;
