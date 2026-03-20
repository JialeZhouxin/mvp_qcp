import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { toErrorMessage } from "../../api/errors";
import {
  getTaskCenterDetail,
  getTaskCenterList,
  type TaskCenterDetailResponse,
  type TaskCenterListItem,
} from "../../api/task-center";
import TaskDetailPanel from "../../components/task-center/TaskDetailPanel";
import TaskListPanel from "../../components/task-center/TaskListPanel";
import {
  connectTaskStatusStream,
  type TaskStatusStreamEvent,
  type TaskStreamConnection,
} from "../realtime/task-stream-client";

function TaskCenterScreen() {
  const [tasks, setTasks] = useState<TaskCenterListItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TaskCenterDetailResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [streamDisconnected, setStreamDisconnected] = useState(false);
  const [streamVersion, setStreamVersion] = useState(0);
  const selectedTaskRef = useRef<number | null>(null);
  const streamRef = useRef<TaskStreamConnection | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  selectedTaskRef.current = selectedTaskId;

  const loadList = async (nextFilter: string) => {
    setListLoading(true);
    setListError(null);
    try {
      const response = await getTaskCenterList({
        status: nextFilter === "ALL" ? undefined : nextFilter,
        limit: 50,
        offset: 0,
      });
      setTasks(response.items);
    } catch (error) {
      setListError(toErrorMessage(error, "加载任务列表失败"));
    } finally {
      setListLoading(false);
    }
  };

  const loadDetail = async (taskId: number) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const response = await getTaskCenterDetail(taskId);
      setDetail(response);
    } catch (error) {
      setDetailError(toErrorMessage(error, "加载任务详情失败"));
    } finally {
      setDetailLoading(false);
    }
  };

  const applyStreamEvent = (event: TaskStatusStreamEvent) => {
    setTasks((previous) =>
      previous.map((task) =>
        task.task_id === event.task_id
          ? {
              ...task,
              status: event.status,
              updated_at: event.updated_at,
              duration_ms: event.duration_ms,
              attempt_count: event.attempt_count,
            }
          : task,
      ),
    );
    if (selectedTaskRef.current === event.task_id) {
      void loadDetail(event.task_id);
    }
  };

  useEffect(() => {
    void loadList(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    if (selectedTaskId === null) {
      return;
    }
    void loadDetail(selectedTaskId);
  }, [selectedTaskId]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
    setStreamDisconnected(false);
    streamRef.current = connectTaskStatusStream(null, {
      onStatus: applyStreamEvent,
      onError: () => setStreamDisconnected(true),
      onDisconnect: () => setStreamDisconnected(true),
    });
    return () => {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    };
  }, [streamVersion]);

  useEffect(() => {
    if (!streamDisconnected) {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }
    pollTimerRef.current = window.setInterval(() => {
      void loadList(statusFilter);
      if (selectedTaskRef.current !== null) {
        void loadDetail(selectedTaskRef.current);
      }
    }, 3000);
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [streamDisconnected, statusFilter]);

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
          <button
            type="button"
            onClick={() => setStreamVersion((previous) => previous + 1)}
            style={{ marginLeft: 8 }}
          >
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
          onRefresh={() => void loadList(statusFilter)}
        />
        <TaskDetailPanel detail={detail} loading={detailLoading} error={detailError} />
      </section>
    </main>
  );
}

export default TaskCenterScreen;
