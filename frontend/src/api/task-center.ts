import { apiRequest } from "./client";
import type {
  TaskCenterDetailResponse,
  TaskCenterListItem,
  TaskCenterListResponse,
  TaskDiagnostic,
} from "./generated/contracts";

interface ListTaskCenterOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

export type { TaskCenterDetailResponse, TaskCenterListItem, TaskCenterListResponse, TaskDiagnostic } from "./generated/contracts";

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
