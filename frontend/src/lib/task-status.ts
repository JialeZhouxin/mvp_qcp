export const TASK_STATUSES = [
  "PENDING",
  "RUNNING",
  "SUCCESS",
  "FAILURE",
  "TIMEOUT",
  "RETRY_EXHAUSTED",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_FILTER_OPTIONS = ["ALL", ...TASK_STATUSES] as const;

export type TaskStatusFilter = (typeof TASK_STATUS_FILTER_OPTIONS)[number];

const TERMINAL_TASK_STATUS_SET = new Set<TaskStatus>([
  "SUCCESS",
  "FAILURE",
  "TIMEOUT",
  "RETRY_EXHAUSTED",
]);

const ACTIVE_TASK_STATUS_SET = new Set<TaskStatus>(["PENDING", "RUNNING"]);

const FAILURE_TASK_STATUS_SET = new Set<TaskStatus>([
  "FAILURE",
  "TIMEOUT",
  "RETRY_EXHAUSTED",
]);

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "\u6392\u961F\u4E2D",
  RUNNING: "\u8FD0\u884C\u4E2D",
  SUCCESS: "\u6267\u884C\u6210\u529F",
  FAILURE: "\u6267\u884C\u5931\u8D25",
  TIMEOUT: "\u6267\u884C\u8D85\u65F6",
  RETRY_EXHAUSTED: "\u91CD\u8BD5\u5DF2\u8017\u5C3D",
};

export function isTaskStatus(status: string | null): status is TaskStatus {
  return status !== null && TASK_STATUSES.includes(status as TaskStatus);
}

export function isActiveTaskStatus(status: string | null): boolean {
  return isTaskStatus(status) && ACTIVE_TASK_STATUS_SET.has(status);
}

export function isTerminalTaskStatus(status: string | null): boolean {
  return isTaskStatus(status) && TERMINAL_TASK_STATUS_SET.has(status);
}

export function isFailureTaskStatus(status: string | null): boolean {
  return isTaskStatus(status) && FAILURE_TASK_STATUS_SET.has(status);
}

export function toTaskStatusLabel(status: string | null): string {
  if (!isTaskStatus(status)) {
    return status ?? "-";
  }
  return TASK_STATUS_LABELS[status];
}
