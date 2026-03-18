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
          {submitting ? "提交中..." : "提交任务"}
        </button>
        <span>任务 ID: {taskId ?? "-"}</span>
        <span>
          任务状态: <span data-testid="task-status-text">{taskStatusLabel}</span>
        </span>
        <span>
          已耗时: <span data-testid="task-elapsed-seconds">{elapsedSeconds}</span> 秒
        </span>
      </div>

      {deduplicated ? (
        <p style={{ margin: "8px 0 0 0", color: "#1677ff" }}>
          检测到重复提交，系统已复用已有任务。
        </p>
      ) : null}
      {submitError ? (
        <p style={{ margin: "8px 0 0 0", color: "#cf1322" }}>{submitError}</p>
      ) : null}
    </section>
  );
}

export default WorkbenchSubmitPanel;
