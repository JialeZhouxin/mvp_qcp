interface CodeTasksActionsProps {
  readonly taskId: number | null;
  readonly autoPolling: boolean;
  readonly onAutoPollingChange: (checked: boolean) => void;
  readonly onRefreshStatus: () => void;
  readonly onLoadResult: () => void;
}

function CodeTasksActions({
  taskId,
  autoPolling,
  onAutoPollingChange,
  onRefreshStatus,
  onLoadResult,
}: CodeTasksActionsProps) {
  return (
    <section style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
      <button type="button" onClick={onRefreshStatus} disabled={!taskId}>
        刷新任务状态
      </button>
      <button type="button" onClick={onLoadResult} disabled={!taskId}>
        加载任务结果
      </button>
      <label>
        <input
          type="checkbox"
          checked={autoPolling}
          onChange={(event) => onAutoPollingChange(event.target.checked)}
        />
        自动轮询
      </label>
    </section>
  );
}

export default CodeTasksActions;
