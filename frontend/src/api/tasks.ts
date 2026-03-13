import { apiRequest } from "./client";

export interface TaskSubmitResponse {
  task_id: number;
  status: string;
  deduplicated?: boolean;
}

export interface TaskStatusResponse {
  task_id: number;
  status: string;
  error_message?: unknown;
}

export interface TaskResultResponse {
  task_id: number;
  status: string;
  result?: {
    counts: Record<string, number>;
    probabilities: Record<string, number>;
  };
  message?: string;
}

interface SubmitTaskOptions {
  readonly idempotencyKey?: string;
}

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
