import { useEffect, useRef, type MutableRefObject } from "react";

import type { UseTaskCenterRealtimeParams } from "./use-task-center-realtime.types";

const FALLBACK_POLL_INTERVAL_MS = 3000;

interface UseTaskCenterFallbackPollingParams {
  readonly enabled: boolean;
  readonly statusFilter: string;
  readonly selectedTaskIdRef: MutableRefObject<number | null>;
  readonly refreshList: UseTaskCenterRealtimeParams["refreshList"];
  readonly refreshDetail: UseTaskCenterRealtimeParams["refreshDetail"];
}

function clearPollTimer(pollTimerRef: MutableRefObject<number | null>): void {
  if (pollTimerRef.current !== null) {
    window.clearInterval(pollTimerRef.current);
    pollTimerRef.current = null;
  }
}

export function useTaskCenterFallbackPolling({
  enabled,
  statusFilter,
  selectedTaskIdRef,
  refreshList,
  refreshDetail,
}: UseTaskCenterFallbackPollingParams) {
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      clearPollTimer(pollTimerRef);
      return;
    }

    pollTimerRef.current = window.setInterval(() => {
      void refreshList();
      if (selectedTaskIdRef.current !== null) {
        void refreshDetail();
      }
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      clearPollTimer(pollTimerRef);
    };
  }, [enabled, refreshDetail, refreshList, selectedTaskIdRef, statusFilter]);
}
