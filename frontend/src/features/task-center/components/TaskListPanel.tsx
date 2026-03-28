import type { TaskCenterListItem } from "../../../api/task-center";
import { TASK_STATUS_FILTER_OPTIONS } from "../../../lib/task-status";

interface TaskListPanelProps {
  tasks: TaskCenterListItem[];
  selectedTaskId: number | null;
  statusFilter: string;
  loading: boolean;
  error: string | null;
  onSelectTask: (taskId: number) => void;
  onStatusFilterChange: (status: string) => void;
  onRefresh: () => void;
}

function TaskListPanel({
  tasks,
  selectedTaskId,
  statusFilter,
  loading,
  error,
  onSelectTask,
  onStatusFilterChange,
  onRefresh,
}: TaskListPanelProps) {
  return (
    <section className="tasks-theme-panel" style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{"\u4EFB\u52A1\u5217\u8868"}</h3>
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          data-testid="task-status-filter"
        >
          {TASK_STATUS_FILTER_OPTIONS.map((value) => (
            <option value={value} key={value}>
              {value === "ALL" ? "\u5168\u90E8\u72B6\u6001" : value}
            </option>
          ))}
        </select>
        <button type="button" onClick={onRefresh}>
          {"\u5237\u65B0"}
        </button>
      </div>
      {loading ? <p>{"\u52A0\u8F7D\u4E2D..."}</p> : null}
      {error ? <p style={{ color: "var(--accent-danger)" }}>{error}</p> : null}
      <div style={{ maxHeight: 360, overflow: "auto", display: "grid", gap: 6 }}>
        {tasks.map((task) => (
          <button
            type="button"
            key={task.task_id}
            onClick={() => onSelectTask(task.task_id)}
            style={{
              textAlign: "left",
              border:
                task.task_id === selectedTaskId
                  ? "1px solid var(--accent-primary)"
                  : "1px solid var(--border-subtle)",
              background: "var(--surface-panel-muted)",
              borderRadius: 8,
              padding: 8,
            }}
          >
            <div>
              #{task.task_id} {task.status}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {"\u91CD\u8BD5"} {task.attempt_count} {"\u6B21 | \u8017\u65F6"} {task.duration_ms ?? "-"} ms
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default TaskListPanel;
