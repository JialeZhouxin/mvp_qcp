import { useCallback } from "react";
import { Link } from "react-router-dom";

import TaskDetailPanel from "../../components/task-center/TaskDetailPanel";
import TaskListPanel from "../../components/task-center/TaskListPanel";
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
        <h1 style={{ marginBottom: 8 }}>Ã¤Â»Â»Ã¥Å Â¡Ã¤Â¸Â­Ã¥Â¿Æ’Ã¯Â¼Ë†Ã§Å Â¶Ã¦â‚¬ÂÃ¨Â·Å¸Ã¨Â¸ÂªÃ¤Â¸Å½Ã§Â»â€œÃ¦Å¾Å“Ã¨Â¯Å Ã¦â€“Â­Ã¯Â¼â€°</h1>
        <p style={{ margin: 0, color: "#666" }}>
          Ã¥Å“Â¨Ã¨Â¿â„¢Ã©â€¡Å’Ã§Â»Å¸Ã¤Â¸â‚¬Ã¦Å¸Â¥Ã§Å“â€¹Ã¤Â»Â»Ã¥Å Â¡Ã§Å Â¶Ã¦â‚¬ÂÃ£â‚¬ÂÃ¦â€°Â§Ã¨Â¡Å’Ã§Â»â€œÃ¦Å¾Å“Ã¤Â¸Å½Ã¥Â¤Â±Ã¨Â´Â¥Ã¨Â¯Å Ã¦â€“Â­Ã¯Â¼Å’Ã¥Â¿Â«Ã©â‚¬Å¸Ã¥Â®Å¡Ã¤Â½ÂÃ©â€”Â®Ã©Â¢ËœÃ¥Â¹Â¶Ã¥â€ºÅ¾Ã¥Ë†Â°Ã¥Â¯Â¹Ã¥Âºâ€Ã¦Â¨Â¡Ã¥Ââ€”Ã§Â»Â§Ã§Â»Â­Ã¥Â¤â€žÃ§Ââ€ Ã£â‚¬â€š
        </p>
        <p style={{ marginTop: 8 }}>
          <Link to="/tasks/circuit">Ã¥â€ºÂ¾Ã¥Â½Â¢Ã¥Å’â€“Ã§Â¼â€“Ã§Â¨â€¹</Link> Ã‚Â· <Link to="/tasks/code">Ã¤Â»Â£Ã§Â ÂÃ¦ÂÂÃ¤ÂºÂ¤</Link> Ã‚Â·{" "}
          <Link to="/tasks/help">Ã¥Â¸Â®Ã¥Å Â©Ã¦â€“â€¡Ã¦Â¡Â£</Link>
        </p>
      </header>

      {streamDisconnected ? (
        <section style={{ border: "1px solid #ffccc7", background: "#fff2f0", padding: 10, borderRadius: 8 }}>
          Ã¥Â®Å¾Ã¦â€”Â¶Ã§Å Â¶Ã¦â‚¬ÂÃ¦ÂµÂÃ¨Â¿Å¾Ã¦Å½Â¥Ã¥Â·Â²Ã¦â€“Â­Ã¥Â¼â‚¬Ã¯Â¼Å’Ã§Â³Â»Ã§Â»Å¸Ã¤Â¼Å¡Ã¨â€¡ÂªÃ¥Å Â¨Ã©â„¢ÂÃ§ÂºÂ§Ã¤Â¸ÂºÃ¨Â½Â®Ã¨Â¯Â¢Ã£â‚¬â€šÃ¤Â½Â Ã¤Â¹Å¸Ã¥ÂÂ¯Ã¤Â»Â¥Ã¦â€°â€¹Ã¥Å Â¨Ã©â€¡ÂÃ¨Â¿Å¾Ã£â‚¬â€š
          <button type="button" onClick={reconnect} style={{ marginLeft: 8 }}>
            Ã§Â«â€¹Ã¥ÂÂ³Ã©â€¡ÂÃ¨Â¿Å¾
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
