import { apiRequest } from "./client";
import type { TaskResultResponse, TaskStatusResponse, TaskSubmitResponse } from "./generated/contracts";

interface SubmitTaskOptions {
  readonly idempotencyKey?: string;
}

export type { TaskResultResponse, TaskStatusResponse, TaskSubmitResponse } from "./generated/contracts";

export function submitTask(code: string, options: SubmitTaskOptions = {}): Promise<TaskSubmitResponse> {
  const headers = options.idempotencyKey
    ? { "Idempotency-Key": options.idempotencyKey }
    : undefined;
  return apiRequest("/api/tasks/submit", {
    method: "POST",
    body: { code },
    withAuth: true,
    headers,
  });
}

export function getTaskStatus(taskId: number): Promise<TaskStatusResponse> {
  return apiRequest(`/api/tasks/${taskId}`, { withAuth: true });
}

export function getTaskResult(taskId: number): Promise<TaskResultResponse> {
  return apiRequest(`/api/tasks/${taskId}/result`, { withAuth: true });
}
