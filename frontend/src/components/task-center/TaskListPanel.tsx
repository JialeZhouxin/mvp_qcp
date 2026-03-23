import type { TaskCenterListItem } from "../../api/task-center";
import { TASK_STATUS_FILTER_OPTIONS } from "../../features/task-status/task-status";

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
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>\u4efb\u52a1\u5217\u8868</h3>
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          data-testid="task-status-filter"
        >
          {TASK_STATUS_FILTER_OPTIONS.map((value) => (
            <option value={value} key={value}>
              {value === "ALL" ? "\u5168\u90e8\u72b6\u6001" : value}
            </option>
          ))}
        </select>
        <button type="button" onClick={onRefresh}>
          \u5237\u65b0
        </button>
      </div>
      {loading ? <p>\u52a0\u8f7d\u4e2d...</p> : null}
      {error ? <p style={{ color: "#cf1322" }}>{error}</p> : null}
      <div style={{ maxHeight: 360, overflow: "auto", display: "grid", gap: 6 }}>
        {tasks.map((task) => (
          <button
            type="button"
            key={task.task_id}
            onClick={() => onSelectTask(task.task_id)}
            style={{
              textAlign: "left",
              border: task.task_id === selectedTaskId ? "1px solid #1677ff" : "1px solid #ddd",
              background: "#fff",
              borderRadius: 6,
              padding: 8,
            }}
          >
            <div>#{task.task_id} {task.status}</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              \u91cd\u8bd5 {task.attempt_count} \u6b21 | \u8017\u65f6 {task.duration_ms ?? "-"} ms
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default TaskListPanel;
