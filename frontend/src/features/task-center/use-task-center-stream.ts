import { useEffect, useRef, useState, type MutableRefObject } from "react";

import {
  subscribeTaskStream,
  type TaskStreamConnection,
} from "../../api/task-stream";
import type { UseTaskCenterRealtimeParams } from "./use-task-center-realtime.types";

interface UseTaskCenterStreamParams {
  readonly streamVersion: number;
  readonly selectedTaskIdRef: MutableRefObject<number | null>;
  readonly refreshDetail: UseTaskCenterRealtimeParams["refreshDetail"];
  readonly onTaskStatus: UseTaskCenterRealtimeParams["onTaskStatus"];
}

function closeStreamConnection(
  streamRef: MutableRefObject<TaskStreamConnection | null>,
): void {
  if (streamRef.current) {
    streamRef.current.close();
    streamRef.current = null;
  }
}

export function useTaskCenterStream({
  streamVersion,
  selectedTaskIdRef,
  refreshDetail,
  onTaskStatus,
}: UseTaskCenterStreamParams) {
  const [streamDisconnected, setStreamDisconnected] = useState(false);
  const streamRef = useRef<TaskStreamConnection | null>(null);

  useEffect(() => {
    closeStreamConnection(streamRef);
    setStreamDisconnected(false);
    const handleStreamUnavailable = () => setStreamDisconnected(true);

    streamRef.current = subscribeTaskStream(null, {
      onStatus: (event) => {
        onTaskStatus(event);
        if (selectedTaskIdRef.current === event.task_id) {
          void refreshDetail();
        }
      },
      onError: handleStreamUnavailable,
      onDisconnect: handleStreamUnavailable,
    });

    return () => {
      closeStreamConnection(streamRef);
    };
  }, [onTaskStatus, refreshDetail, selectedTaskIdRef, streamVersion]);

  return {
    streamDisconnected,
  };
}
