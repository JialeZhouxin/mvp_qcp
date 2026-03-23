import { useRef, useState } from "react";

import { useTaskCenterFallbackPolling } from "./use-task-center-fallback-polling";
import { useTaskCenterStream } from "./use-task-center-stream";
import type { UseTaskCenterRealtimeParams } from "./use-task-center-realtime.types";

export function useTaskCenterRealtime({
  statusFilter,
  selectedTaskId,
  refreshList,
  refreshDetail,
  onTaskStatus,
}: UseTaskCenterRealtimeParams) {
  const [streamVersion, setStreamVersion] = useState(0);
  const selectedTaskIdRef = useRef<number | null>(selectedTaskId);

  selectedTaskIdRef.current = selectedTaskId;

  const { streamDisconnected } = useTaskCenterStream({
    streamVersion,
    selectedTaskIdRef,
    refreshDetail,
    onTaskStatus,
  });

  useTaskCenterFallbackPolling({
    enabled: streamDisconnected,
    statusFilter,
    selectedTaskIdRef,
    refreshList,
    refreshDetail,
  });

  return {
    streamDisconnected,
    reconnect: () => setStreamVersion((previous) => previous + 1),
  };
}
