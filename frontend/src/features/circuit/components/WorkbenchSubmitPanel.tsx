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
      style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}
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
          {submitting ? "鎻愪氦涓?.." : "鎻愪氦浠诲姟"}
        </button>
        <span>浠诲姟 ID: {taskId ?? "-"}</span>
        <span>
          浠诲姟鐘舵€? <span data-testid="task-status-text">{taskStatusLabel}</span>
        </span>
        <span>
          宸茶€楁椂: <span data-testid="task-elapsed-seconds">{elapsedSeconds}</span> 绉?        </span>
      </div>

      {deduplicated ? (
        <p style={{ margin: "8px 0 0 0", color: "#1677ff" }}>
          妫€娴嬪埌閲嶅鎻愪氦锛岀郴缁熷凡澶嶇敤宸叉湁浠诲姟銆?        </p>
      ) : null}
      {submitError ? (
        <p style={{ margin: "8px 0 0 0", color: "#cf1322" }}>{submitError}</p>
      ) : null}
    </section>
  );
}

export default WorkbenchSubmitPanel;

