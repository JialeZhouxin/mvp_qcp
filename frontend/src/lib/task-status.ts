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
  PENDING: "排队中",
  RUNNING: "执行中",
  SUCCESS: "执行成功",
  FAILURE: "执行失败",
  TIMEOUT: "执行超时",
  RETRY_EXHAUSTED: "重试耗尽",
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
