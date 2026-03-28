import { WORKBENCH_COPY } from "../ui/copy-catalog";

interface WorkbenchSubmitPanelProps {
  readonly submitting: boolean;
  readonly canSubmit: boolean;
  readonly taskId: number | null;
  readonly taskStatusLabel: string;
  readonly submitError: string | null;
  readonly deduplicated: boolean;
  readonly elapsedSeconds: number;
  readonly onSubmit: () => void;
}

function WorkbenchSubmitPanel({
  submitting,
  canSubmit,
  taskId,
  taskStatusLabel,
  submitError,
  deduplicated,
  elapsedSeconds,
  onSubmit,
}: WorkbenchSubmitPanelProps) {
  const submitDisabled = submitting || !canSubmit;

  return (
    <section
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: 12,
        padding: 12,
        background: "var(--surface-panel)",
      }}
      data-testid="workbench-submit-panel"
    >
      <div
        data-testid="workbench-submit-inline-row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "nowrap",
          whiteSpace: "nowrap",
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        <button type="button" onClick={onSubmit} disabled={submitDisabled}>
          {submitting ? WORKBENCH_COPY.submitPanel.submitting : WORKBENCH_COPY.submitPanel.submit}
        </button>
        <span>
          {WORKBENCH_COPY.submitPanel.taskId}: {taskId ?? "-"}
        </span>
        <span>
          {WORKBENCH_COPY.submitPanel.taskStatus}:{" "}
          <span data-testid="task-status-text">{taskStatusLabel}</span>
        </span>
        <span>
          {WORKBENCH_COPY.submitPanel.elapsed}:{" "}
          <span data-testid="task-elapsed-seconds">{elapsedSeconds}</span>{" "}
          {WORKBENCH_COPY.submitPanel.seconds}
        </span>
      </div>

      {deduplicated ? (
        <p style={{ margin: "8px 0 0 0", color: "var(--accent-primary)" }}>
          {WORKBENCH_COPY.submitPanel.deduplicatedHint}
        </p>
      ) : null}
      {submitError ? (
        <p style={{ margin: "8px 0 0 0", color: "var(--accent-danger)" }}>{submitError}</p>
      ) : null}
    </section>
  );
}

export default WorkbenchSubmitPanel;
