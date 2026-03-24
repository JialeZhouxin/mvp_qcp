import type { TaskCenterDetailResponse } from "../../../api/task-center";

interface TaskDetailPanelProps {
  detail: TaskCenterDetailResponse | null;
  loading: boolean;
  error: string | null;
}

function TaskDetailPanel({ detail, loading, error }: TaskDetailPanelProps) {
  if (loading) {
    return (
      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>任务详情</h3>
        <p>加载中...</p>
      </section>
    );
  }
  if (error) {
    return (
      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>任务详情</h3>
        <p style={{ color: "#cf1322" }}>{error}</p>
      </section>
    );
  }
  if (!detail) {
    return (
      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>任务详情</h3>
        <p style={{ color: "#666" }}>请选择一个任务查看执行结果与诊断信息。</p>
      </section>
    );
  }
  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>任务详情 #{detail.task_id}</h3>
      <p style={{ margin: "0 0 6px 0" }}>状态：{detail.status}</p>
      <p style={{ margin: "0 0 6px 0" }}>重试次数：{detail.attempt_count}</p>
      <p style={{ margin: "0 0 6px 0" }}>耗时：{detail.duration_ms ?? "-"} ms</p>

      {detail.diagnostic ? (
        <div style={{ border: "1px solid #ffe58f", background: "#fffbe6", padding: 8, borderRadius: 6 }}>
          <p style={{ margin: "0 0 4px 0" }}>
            诊断：[{detail.diagnostic.code}] {detail.diagnostic.summary ?? detail.diagnostic.message}
          </p>
          <p style={{ margin: "0 0 4px 0", color: "#666" }}>阶段：{detail.diagnostic.phase}</p>
          <p style={{ margin: "0 0 6px 0", color: "#666" }}>消息：{detail.diagnostic.message}</p>
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
        <pre style={{ marginTop: 8, background: "#f7f7f7", padding: 8, borderRadius: 6 }}>
          {JSON.stringify(detail.result, null, 2)}
        </pre>
      ) : (
        <p style={{ marginTop: 8, color: "#666" }}>暂无结果。</p>
      )}
    </section>
  );
}

export default TaskDetailPanel;
