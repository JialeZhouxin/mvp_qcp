import type { TaskStatusStreamEvent } from "../../api/task-stream";

export interface UseTaskCenterRealtimeParams {
  readonly statusFilter: string;
  readonly selectedTaskId: number | null;
  readonly refreshList: () => Promise<void>;
  readonly refreshDetail: () => Promise<void>;
  readonly onTaskStatus: (event: TaskStatusStreamEvent) => void;
}
