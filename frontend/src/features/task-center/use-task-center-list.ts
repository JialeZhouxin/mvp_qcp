import { useCallback, useEffect, useState } from "react";

import { toErrorMessage } from "../../api/errors";
import {
  getTaskCenterList,
  type TaskCenterListItem,
} from "../../api/task-center";
import type { TaskStatusStreamEvent } from "../realtime/task-stream-client";

export function useTaskCenterList() {
  const [tasks, setTasks] = useState<TaskCenterListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const refreshList = useCallback(async (nextFilter: string = statusFilter) => {
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
      setListError(toErrorMessage(error, "åŠ è½½ä»»åŠ¡åˆ—è¡¨å¤±è´¥"));
    } finally {
      setListLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void refreshList(statusFilter);
  }, [refreshList, statusFilter]);

  const applyTaskStatusEvent = useCallback((event: TaskStatusStreamEvent) => {
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
  }, []);

  return {
    tasks,
    statusFilter,
    setStatusFilter,
    listLoading,
    listError,
    refreshList,
    applyTaskStatusEvent,
  };
}
