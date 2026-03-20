import { useCallback, useEffect, useState } from "react";

import { toErrorMessage } from "../../api/errors";
import {
  getTaskCenterDetail,
  type TaskCenterDetailResponse,
} from "../../api/task-center";

export function useTaskCenterDetail() {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TaskCenterDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const refreshDetail = useCallback(async (taskId: number | null = selectedTaskId) => {
    if (taskId === null) {
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    try {
      const response = await getTaskCenterDetail(taskId);
      setDetail(response);
    } catch (error) {
      setDetailError(toErrorMessage(error, "åŠ è½½ä»»åŠ¡è¯¦æƒ…å¤±è´¥"));
    } finally {
      setDetailLoading(false);
    }
  }, [selectedTaskId]);

  useEffect(() => {
    if (selectedTaskId === null) {
      return;
    }
    void refreshDetail(selectedTaskId);
  }, [refreshDetail, selectedTaskId]);

  return {
    selectedTaskId,
    setSelectedTaskId,
    detail,
    detailLoading,
    detailError,
    refreshDetail,
  };
}
