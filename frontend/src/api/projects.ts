import { apiRequest } from "./client";
import type {
  ProjectDetailResponse,
  ProjectItemResponse,
  ProjectListResponse,
  ProjectSaveRequest,
} from "./generated/contracts";

export type ProjectItem = ProjectItemResponse;
export type ProjectDetail = ProjectDetailResponse;
export type SaveProjectRequest = ProjectSaveRequest;

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
