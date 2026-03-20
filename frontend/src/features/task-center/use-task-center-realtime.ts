import { useEffect, useRef, useState } from "react";

import type { TaskStatusStreamEvent } from "../realtime/task-stream-client";
import {
  connectTaskStatusStream,
  type TaskStreamConnection,
} from "../realtime/task-stream-client";

const FALLBACK_POLL_INTERVAL_MS = 3000;

interface UseTaskCenterRealtimeParams {
  readonly statusFilter: string;
  readonly selectedTaskId: number | null;
  readonly refreshList: () => Promise<void>;
  readonly refreshDetail: () => Promise<void>;
  readonly onTaskStatus: (event: TaskStatusStreamEvent) => void;
}

export function useTaskCenterRealtime({
  statusFilter,
  selectedTaskId,
  refreshList,
  refreshDetail,
  onTaskStatus,
}: UseTaskCenterRealtimeParams) {
  const [streamDisconnected, setStreamDisconnected] = useState(false);
  const [streamVersion, setStreamVersion] = useState(0);
  const streamRef = useRef<TaskStreamConnection | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const selectedTaskIdRef = useRef<number | null>(selectedTaskId);

  selectedTaskIdRef.current = selectedTaskId;

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
    setStreamDisconnected(false);
    streamRef.current = connectTaskStatusStream(null, {
      onStatus: (event) => {
        onTaskStatus(event);
        if (selectedTaskIdRef.current === event.task_id) {
          void refreshDetail();
        }
      },
      onError: () => setStreamDisconnected(true),
      onDisconnect: () => setStreamDisconnected(true),
    });
    return () => {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
    };
  }, [refreshDetail, onTaskStatus, streamVersion]);

  useEffect(() => {
    if (!streamDisconnected) {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    pollTimerRef.current = window.setInterval(() => {
      void refreshList();
      if (selectedTaskIdRef.current !== null) {
        void refreshDetail();
      }
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [refreshDetail, refreshList, statusFilter, streamDisconnected]);

  return {
    streamDisconnected,
    reconnect: () => setStreamVersion((previous) => previous + 1),
  };
}
