import { getAccessToken } from "../auth/session-store";
import { API_BASE_URL } from "./client";
import type {
  TaskHeartbeatEvent,
  TaskStatusStreamEvent,
  TaskStreamMessage,
} from "./generated/contracts";

export interface TaskStreamCallbacks {
  onStatus: (event: TaskStatusStreamEvent) => void;
  onHeartbeat?: (event: TaskHeartbeatEvent) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface TaskStreamConnection {
  close: () => void;
}

function parseEventBlock(block: string, callbacks: TaskStreamCallbacks): void {
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

  const message = {
    event: eventName,
    data: JSON.parse(dataText),
  } as TaskStreamMessage;

  if (message.event === "task_status") {
    callbacks.onStatus(message.data);
    return;
  }
  if (message.event === "heartbeat" && callbacks.onHeartbeat) {
    callbacks.onHeartbeat(message.data);
  }
}

export type { TaskHeartbeatEvent, TaskStatusStreamEvent, TaskStreamMessage };

export function subscribeTaskStream(
  taskIds: number[] | null,
  callbacks: TaskStreamCallbacks,
): TaskStreamConnection {
  const token = getAccessToken();
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
