import { apiRequest } from "./client";

export interface TaskDiagnostic {
  code: string;
  message: string;
  phase: string;
  summary: string | null;
  suggestions: string[];
}

export interface TaskCenterListItem {
  task_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  duration_ms: number | null;
  attempt_count: number;
  has_result: boolean;
}

export interface TaskCenterListResponse {
  items: TaskCenterListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface TaskCenterDetailResponse {
  task_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  attempt_count: number;
  result: Record<string, unknown> | null;
  diagnostic: TaskDiagnostic | null;
}

interface ListTaskCenterOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

export function getTaskCenterList(
  options: ListTaskCenterOptions = {},
): Promise<TaskCenterListResponse> {
  const query = new URLSearchParams();
  if (options.status) {
    query.set("status", options.status);
  }
  query.set("limit", `${options.limit ?? 20}`);
  query.set("offset", `${options.offset ?? 0}`);
  const suffix = query.toString();
  return apiRequest(`/api/tasks${suffix ? `?${suffix}` : ""}`, { withAuth: true });
}

export function getTaskCenterDetail(taskId: number): Promise<TaskCenterDetailResponse> {
  return apiRequest(`/api/tasks/${taskId}/detail`, { withAuth: true });
}
