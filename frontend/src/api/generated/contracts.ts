// Generated from backend OpenAPI. Do not edit by hand.


export type ProjectEntryType = "code" | "circuit";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type?: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_name: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface RegisterResponse {
  user_id: number;
  username: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_name: string;
}

export interface ProjectItemResponse {
  id: number;
  name: string;
  entry_type: "code" | "circuit";
  last_task_id?: number | null;
  updated_at: string;
}

export interface ProjectDetailResponse {
  id: number;
  name: string;
  entry_type: "code" | "circuit";
  last_task_id?: number | null;
  updated_at: string;
  payload: Record<string, unknown>;
}

export interface ProjectListResponse {
  projects: ProjectItemResponse[];
}

export interface ProjectSaveRequest {
  entry_type: "code" | "circuit";
  payload: Record<string, unknown>;
  last_task_id?: number | null;
}

export interface TaskSubmitRequest {
  code: string;
}

export interface CircuitTaskOperationRequest {
  gate: string;
  targets: number[];
  controls?: number[] | null;
  params?: number[] | null;
}

export interface CircuitTaskSubmitRequest {
  num_qubits: number;
  operations?: CircuitTaskOperationRequest[];
}

export interface TaskSubmitResponse {
  task_id: number;
  status: string;
  task_type: string;
  deduplicated?: boolean;
}

export interface TaskStatusResponse {
  task_id: number;
  status: string;
  task_type: string;
  error_message?: unknown | null;
}

export interface TaskResultResponse {
  task_id: number;
  status: string;
  task_type: string;
  result?: Record<string, unknown> | null;
  message?: string | null;
}

export interface TaskDiagnostic {
  code: string;
  message: string;
  phase?: string;
  summary?: string | null;
  suggestions?: string[];
}

export interface TaskCenterListItem {
  task_id: number;
  status: string;
  task_type: string;
  created_at: string;
  updated_at: string;
  duration_ms?: number | null;
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
  task_type: string;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  duration_ms?: number | null;
  attempt_count: number;
  result?: Record<string, unknown> | null;
  diagnostic?: TaskDiagnostic | null;
}

export interface TaskStatusStreamEvent {
  task_id: number;
  status: string;
  updated_at: string;
  duration_ms?: number | null;
  attempt_count: number;
}

export interface TaskHeartbeatEvent {
  timestamp: string;
}

export type TaskStreamMessage =
  | { event: "task_status"; data: TaskStatusStreamEvent }
  | { event: "heartbeat"; data: TaskHeartbeatEvent };
