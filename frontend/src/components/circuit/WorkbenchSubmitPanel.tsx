import { Link } from "react-router-dom";

interface WorkbenchSubmitPanelProps {
  readonly submitting: boolean;
  readonly canSubmit: boolean;
  readonly taskId: number | null;
  readonly taskStatus: string | null;
  readonly submitError: string | null;
  readonly deduplicated: boolean;
  readonly onSubmit: () => void;
  readonly onRefreshStatus: () => void;
}

function WorkbenchSubmitPanel({
  submitting,
  canSubmit,
  taskId,
  taskStatus,
  submitError,
  deduplicated,
  onSubmit,
  onRefreshStatus,
}: WorkbenchSubmitPanelProps) {
  const hasTask = taskId !== null;
  const submitDisabled = submitting || !canSubmit;

  return (
    <section
      style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}
      data-testid="workbench-submit-panel"
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={onSubmit} disabled={submitDisabled}>
          {submitting ? "提交中..." : "提交任务"}
        </button>
        <button type="button" onClick={onRefreshStatus} disabled={!hasTask || submitting}>
          刷新状态
        </button>
        <Link to="/tasks/center">前往任务中心</Link>
      </div>

      <div style={{ marginTop: 8, color: "#595959" }}>
        <div>任务 ID: {taskId ?? "-"}</div>
        <div>任务状态: {taskStatus ?? "-"}</div>
      </div>

      {deduplicated ? (
        <p style={{ margin: "8px 0 0 0", color: "#1677ff" }}>
          检测到幂等键重复，本次请求复用了已有任务。
        </p>
      ) : null}
      {submitError ? (
        <p style={{ margin: "8px 0 0 0", color: "#cf1322" }}>{submitError}</p>
      ) : null}
      {!hasTask ? (
        <p style={{ margin: "8px 0 0 0", color: "#999" }}>提交后将显示任务 ID 和实时状态。</p>
      ) : null}
    </section>
  );
}

export default WorkbenchSubmitPanel;
