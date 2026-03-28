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
        {"\u5237\u65B0\u4EFB\u52A1\u72B6\u6001"}
      </button>
      <button type="button" onClick={onLoadResult} disabled={!taskId}>
        {"\u52A0\u8F7D\u4EFB\u52A1\u7ED3\u679C"}
      </button>
      <label>
        <input
          type="checkbox"
          checked={autoPolling}
          onChange={(event) => onAutoPollingChange(event.target.checked)}
        />
        {"\u81EA\u52A8\u8F6E\u8BE2"}
      </label>
    </section>
  );
}

export default CodeTasksActions;
