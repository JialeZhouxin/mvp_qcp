import { Link } from "react-router-dom";

type TrackingMode = "idle" | "sse" | "polling";

interface WorkbenchSubmitPanelProps {
  readonly submitting: boolean;
  readonly canSubmit: boolean;
  readonly taskId: number | null;
  readonly taskStatus: string | null;
  readonly taskStatusLabel: string;
  readonly submitError: string | null;
  readonly deduplicated: boolean;
  readonly trackingMode: TrackingMode;
  readonly isTracking: boolean;
  readonly elapsedSeconds: number;
  readonly onSubmit: () => void;
  readonly onRefreshStatus: () => void;
}

function resolveTrackingHint(mode: TrackingMode): string | null {
  if (mode === "sse") {
    return "实时更新中";
  }
  if (mode === "polling") {
    return "实时连接中断，已降级为轮询（3 秒）";
  }
  return null;
}

function WorkbenchSubmitPanel({
  submitting,
  canSubmit,
  taskId,
  taskStatus,
  taskStatusLabel,
  submitError,
  deduplicated,
  trackingMode,
  isTracking,
  elapsedSeconds,
  onSubmit,
  onRefreshStatus,
}: WorkbenchSubmitPanelProps) {
  const hasTask = taskId !== null;
  const submitDisabled = submitting || !canSubmit;
  const trackingHint = resolveTrackingHint(trackingMode);

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
        <Link to="/tasks/center">进入任务中心</Link>
      </div>

      <div style={{ marginTop: 8, color: "#595959", display: "grid", gap: 4 }}>
        <div>任务 ID: {taskId ?? "-"}</div>
        <div>
          任务状态: <span data-testid="task-status-text">{taskStatusLabel}</span>
          {taskStatus ? <span style={{ marginLeft: 6, color: "#999" }}>({taskStatus})</span> : null}
        </div>
        <div>
          跟踪进度: <span data-testid="task-progress-indicator">{isTracking ? "进行中" : "已停止"}</span>
        </div>
        <div>
          跟踪通道: <span data-testid="task-tracking-mode">{trackingHint ?? "-"}</span>
        </div>
        <div>
          已耗时: <span data-testid="task-elapsed-seconds">{elapsedSeconds}</span> 秒
        </div>
      </div>

      {deduplicated ? (
        <p style={{ margin: "8px 0 0 0", color: "#1677ff" }}>
          检测到重复提交，系统已复用已有任务。
        </p>
      ) : null}
      {submitError ? (
        <p style={{ margin: "8px 0 0 0", color: "#cf1322" }}>{submitError}</p>
      ) : null}
      {!hasTask ? (
        <p style={{ margin: "8px 0 0 0", color: "#999" }}>提交后将显示任务 ID 和状态跟踪信息。</p>
      ) : null}
    </section>
  );
}

export default WorkbenchSubmitPanel;
