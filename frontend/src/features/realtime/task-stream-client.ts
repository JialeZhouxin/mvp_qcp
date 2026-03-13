import { getToken } from "../../auth/token";
import { API_BASE_URL } from "../../api/client";

export interface TaskStatusStreamEvent {
  task_id: number;
  status: string;
  updated_at: string;
  duration_ms: number | null;
  attempt_count: number;
}

export interface TaskStreamCallbacks {
  onStatus: (event: TaskStatusStreamEvent) => void;
  onHeartbeat?: (timestamp: string) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface TaskStreamConnection {
  close: () => void;
}

function parseEventBlock(
  block: string,
  callbacks: TaskStreamCallbacks,
): void {
  const lines = block.split("\n");
  let eventName = "message";
  let dataText = "";
  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataText += line.slice("data:".length).trim();
    }
  }
  if (!dataText) {
    return;
  }
  if (eventName === "task_status") {
    callbacks.onStatus(JSON.parse(dataText) as TaskStatusStreamEvent);
    return;
  }
  if (eventName === "heartbeat" && callbacks.onHeartbeat) {
    const payload = JSON.parse(dataText) as { timestamp?: string };
    callbacks.onHeartbeat(payload.timestamp ?? "");
  }
}

export function connectTaskStatusStream(
  taskIds: number[] | null,
  callbacks: TaskStreamCallbacks,
): TaskStreamConnection {
  const token = getToken();
  if (!token) {
    throw new Error("missing access token");
  }
  const query = new URLSearchParams();
  if (taskIds && taskIds.length > 0) {
    query.set("task_ids", taskIds.join(","));
  }
  const url = `${API_BASE_URL}/api/tasks/stream${query.toString() ? `?${query.toString()}` : ""}`;
  const controller = new AbortController();
  let closed = false;

  const run = async () => {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        throw new Error(`task stream unavailable: ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!closed) {
        const result = await reader.read();
        if (result.done) {
          break;
        }
        buffer += decoder.decode(result.value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          parseEventBlock(block.trim(), callbacks);
        }
      }
    } catch (error) {
      if (!closed) {
        callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      if (!closed) {
        callbacks.onDisconnect?.();
      }
    }
  };

  void run();
  return {
    close: () => {
      closed = true;
      controller.abort();
    },
  };
}
