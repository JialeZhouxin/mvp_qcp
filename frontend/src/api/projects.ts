import { apiRequest } from "./client";

export type ProjectEntryType = "code" | "circuit";

export interface ProjectItem {
  id: number;
  name: string;
  entry_type: ProjectEntryType;
  last_task_id: number | null;
  updated_at: string;
}

export interface ProjectDetail extends ProjectItem {
  payload: Record<string, unknown>;
}

export interface ProjectListResponse {
  projects: ProjectItem[];
}

export interface SaveProjectRequest {
  entry_type: ProjectEntryType;
  payload: Record<string, unknown>;
  last_task_id?: number | null;
}

export function saveProject(name: string, payload: SaveProjectRequest): Promise<ProjectDetail> {
  return apiRequest(`/api/projects/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: payload,
    withAuth: true,
  });
}

export function getProjectList(limit = 20, offset = 0): Promise<ProjectListResponse> {
  const query = new URLSearchParams({ limit: `${limit}`, offset: `${offset}` }).toString();
  return apiRequest(`/api/projects?${query}`, { withAuth: true });
}

export function getProjectDetail(projectId: number): Promise<ProjectDetail> {
  return apiRequest(`/api/projects/${projectId}`, { withAuth: true });
}
