import { apiRequest } from "./client";

export interface TaskSubmitResponse {
  task_id: number;
  status: string;
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

export function submitTask(code: string): Promise<TaskSubmitResponse> {
  return apiRequest("/api/tasks/submit", {
    method: "POST",
    body: { code },
    withAuth: true,
  });
}

export function getTaskStatus(taskId: number): Promise<TaskStatusResponse> {
  return apiRequest(`/api/tasks/${taskId}`, { withAuth: true });
}

export function getTaskResult(taskId: number): Promise<TaskResultResponse> {
  return apiRequest(`/api/tasks/${taskId}/result`, { withAuth: true });
}
