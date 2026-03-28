import { useCallback } from "react";
import { Link } from "react-router-dom";

import TaskDetailPanel from "./components/TaskDetailPanel";
import TaskListPanel from "./components/TaskListPanel";
import { useTaskCenterDetail } from "./use-task-center-detail";
import { useTaskCenterList } from "./use-task-center-list";
import { useTaskCenterRealtime } from "./use-task-center-realtime";
import "./TaskCenterScreen.css";

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
  const refreshCurrentList = useCallback(() => refreshList(statusFilter), [refreshList, statusFilter]);
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
    <main className="task-center-screen">
      <header>
        <h1 className="tasks-theme-title" style={{ marginBottom: 8 }}>
          {"\u4EFB\u52A1\u4E2D\u5FC3"}
        </h1>
        <p className="task-center-screen__description">
          {
            "\u67E5\u770B\u4EFB\u52A1\u72B6\u6001\u3001\u6267\u884C\u8BE6\u60C5\u548C\u7ED3\u679C\u6570\u636E\u3002\u652F\u6301\u81EA\u52A8\u5237\u65B0\u4E0E\u5B9E\u65F6\u72B6\u6001\u540C\u6B65\uFF0C\u4FBF\u4E8E\u6392\u67E5\u5931\u8D25\u4EFB\u52A1\u548C\u8FFD\u8E2A\u6267\u884C\u8FDB\u5EA6\u3002"
          }
        </p>
        <p className="task-center-screen__links">
          <Link to="/tasks/circuit">{"\u56FE\u5F62\u5316\u7F16\u7A0B"}</Link> ·{" "}
          <Link to="/tasks/code">{"\u4EE3\u7801\u4EFB\u52A1"}</Link> ·{" "}
          <Link to="/tasks/help">{"\u4F7F\u7528\u8BF4\u660E"}</Link>
        </p>
      </header>

      {streamDisconnected ? (
        <section className="task-center-screen__callout">
          {
            "\u5B9E\u65F6\u4EFB\u52A1\u6D41\u5DF2\u65AD\u5F00\uFF0C\u4EFB\u52A1\u5217\u8868\u4E0D\u4F1A\u81EA\u52A8\u66F4\u65B0\u3002\u4F60\u53EF\u4EE5\u624B\u52A8\u91CD\u8FDE\u4EE5\u6062\u590D\u72B6\u6001\u63A8\u9001\u3002"
          }
          <button type="button" onClick={reconnect} style={{ marginLeft: 8 }}>
            {"\u91CD\u65B0\u8FDE\u63A5"}
          </button>
        </section>
      ) : null}

      <section className="task-center-screen__layout">
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
