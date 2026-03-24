import { useCallback } from "react";
import { Link } from "react-router-dom";

import TaskDetailPanel from "./components/TaskDetailPanel";
import TaskListPanel from "./components/TaskListPanel";
import { useTaskCenterDetail } from "./use-task-center-detail";
import { useTaskCenterList } from "./use-task-center-list";
import { useTaskCenterRealtime } from "./use-task-center-realtime";

function TaskCenterScreen() {
  const {
    tasks,
    statusFilter,
    setStatusFilter,
    listLoading,
    listError,
    refreshList,
    applyTaskStatusEvent,
  } = useTaskCenterList();
  const {
    selectedTaskId,
    setSelectedTaskId,
    detail,
    detailLoading,
    detailError,
    refreshDetail,
  } = useTaskCenterDetail();
  const refreshCurrentList = useCallback(
    () => refreshList(statusFilter),
    [refreshList, statusFilter],
  );
  const refreshCurrentDetail = useCallback(
    () => refreshDetail(selectedTaskId),
    [refreshDetail, selectedTaskId],
  );
  const { streamDisconnected, reconnect } = useTaskCenterRealtime({
    statusFilter,
    selectedTaskId,
    refreshList: refreshCurrentList,
    refreshDetail: refreshCurrentDetail,
    onTaskStatus: applyTaskStatusEvent,
  });

  return (
    <main style={{ maxWidth: 1280, margin: "20px auto 24px", display: "grid", gap: 12 }}>
      <header>
        <h1 style={{ marginBottom: 8 }}>任务中心（状态跟踪与结果诊断）</h1>
        <p style={{ margin: 0, color: "#666" }}>
          在这里统一查看任务状态、执行结果与失败诊断，快速定位问题并回到对应模块继续处理。
        </p>
        <p style={{ marginTop: 8 }}>
          <Link to="/tasks/circuit">图形化编程</Link> · <Link to="/tasks/code">代码提交</Link> ·{" "}
          <Link to="/tasks/help">帮助文档</Link>
        </p>
      </header>

      {streamDisconnected ? (
        <section style={{ border: "1px solid #ffccc7", background: "#fff2f0", padding: 10, borderRadius: 8 }}>
          实时状态流连接已断开，系统会自动降级为轮询。你也可以手动重连。
          <button type="button" onClick={reconnect} style={{ marginLeft: 8 }}>
            立即重连
          </button>
        </section>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TaskListPanel
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          statusFilter={statusFilter}
          loading={listLoading}
          error={listError}
          onSelectTask={setSelectedTaskId}
          onStatusFilterChange={setStatusFilter}
          onRefresh={() => void refreshCurrentList()}
        />
        <TaskDetailPanel detail={detail} loading={detailLoading} error={detailError} />
      </section>
    </main>
  );
}

export default TaskCenterScreen;
