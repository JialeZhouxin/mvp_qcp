import type { TaskCenterDetailResponse } from "../../../api/task-center";

interface TaskDetailPanelProps {
  detail: TaskCenterDetailResponse | null;
  loading: boolean;
  error: string | null;
}

function TaskDetailPanel({ detail, loading, error }: TaskDetailPanelProps) {
  if (loading) {
    return (
      <section className="tasks-theme-panel" style={{ padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>{"\u4EFB\u52A1\u8BE6\u60C5"}</h3>
        <p>{"\u52A0\u8F7D\u4E2D..."}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="tasks-theme-panel" style={{ padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>{"\u4EFB\u52A1\u8BE6\u60C5"}</h3>
        <p style={{ color: "var(--accent-danger)" }}>{error}</p>
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="tasks-theme-panel" style={{ padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>{"\u4EFB\u52A1\u8BE6\u60C5"}</h3>
        <p style={{ color: "var(--text-muted)" }}>
          {
            "\u8BF7\u9009\u62E9\u4E00\u6761\u4EFB\u52A1\uFF0C\u67E5\u770B\u8BE6\u7EC6\u72B6\u6001\u3001\u8BCA\u65AD\u4FE1\u606F\u548C\u7ED3\u679C\u6570\u636E\u3002"
          }
        </p>
      </section>
    );
  }

  return (
    <section className="tasks-theme-panel" style={{ padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>
        {"\u4EFB\u52A1\u8BE6\u60C5"} #{detail.task_id}
      </h3>
      <p style={{ margin: "0 0 6px 0" }}>{"\u72B6\u6001\uFF1A"}{detail.status}</p>
      <p style={{ margin: "0 0 6px 0" }}>{"\u91CD\u8BD5\u6B21\u6570\uFF1A"}{detail.attempt_count}</p>
      <p style={{ margin: "0 0 6px 0" }}>{"\u8017\u65F6\uFF1A"}{detail.duration_ms ?? "-"} ms</p>

      {detail.diagnostic ? (
        <div
          style={{
            border: "1px solid color-mix(in srgb, var(--border-subtle) 45%, var(--accent-info))",
            background: "color-mix(in srgb, var(--surface-panel) 84%, var(--accent-info))",
            padding: 8,
            borderRadius: 8,
          }}
        >
          <p style={{ margin: "0 0 4px 0" }}>
            {"\u8BCA\u65AD\uFF1A"}[{detail.diagnostic.code}] {detail.diagnostic.summary ?? detail.diagnostic.message}
          </p>
          <p style={{ margin: "0 0 4px 0", color: "var(--text-muted)" }}>
            {"\u9636\u6BB5\uFF1A"}{detail.diagnostic.phase}
          </p>
          <p style={{ margin: "0 0 6px 0", color: "var(--text-muted)" }}>
            {"\u6D88\u606F\uFF1A"}{detail.diagnostic.message}
          </p>
          {detail.diagnostic.suggestions.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {detail.diagnostic.suggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {detail.result ? (
        <pre style={{ marginTop: 8, padding: 8 }} className="tasks-theme-codeblock">
          {JSON.stringify(detail.result, null, 2)}
        </pre>
      ) : (
        <p style={{ marginTop: 8, color: "var(--text-muted)" }}>
          {"\u5F53\u524D\u4EFB\u52A1\u8FD8\u6CA1\u6709\u7ED3\u679C\u6570\u636E\u3002"}
        </p>
      )}
    </section>
  );
}

export default TaskDetailPanel;
