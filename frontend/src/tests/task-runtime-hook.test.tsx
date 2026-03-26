import { act, fireEvent, render, screen } from "@testing-library/react";

import type { TaskStatusResponse, TaskSubmitResponse } from "../api/tasks";
import type { TaskStreamCallbacks, TaskStreamConnection } from "../api/task-stream";
import {
  useTaskRuntime,
  type TaskRuntimeTrackingStrategy,
  type UseTaskRuntimeDeps,
} from "../features/task-runtime/use-task-runtime";

interface HookHarnessProps {
  readonly strategy: TaskRuntimeTrackingStrategy;
  readonly deps: Partial<UseTaskRuntimeDeps>;
  readonly initialAutoPolling?: boolean;
}

function HookHarness({ strategy, deps, initialAutoPolling = true }: HookHarnessProps) {
  const {
    taskId,
    taskStatus,
    trackingMode,
    isTracking,
    elapsedSeconds,
    autoPolling,
    setAutoPolling,
    submitTaskCode,
    refreshTaskStatus,
  } = useTaskRuntime({
    deps,
    trackingStrategy: strategy,
    initialAutoPolling,
    submitErrorHint: "submit failed",
    statusRefreshErrorHint: "refresh failed",
  });

  return (
    <section>
      <button type="button" onClick={() => void submitTaskCode("print('ok')")}>
        submit
      </button>
      <button type="button" onClick={() => void refreshTaskStatus()}>
        refresh
      </button>
      <button type="button" onClick={() => setAutoPolling((previous) => !previous)}>
        toggle-auto-polling
      </button>
      <div data-testid="task-id">{taskId ?? "-"}</div>
      <div data-testid="task-status">{taskStatus ?? "-"}</div>
      <div data-testid="tracking-mode">{trackingMode}</div>
      <div data-testid="is-tracking">{String(isTracking)}</div>
      <div data-testid="elapsed-seconds">{elapsedSeconds}</div>
      <div data-testid="auto-polling">{String(autoPolling)}</div>
    </section>
  );
}

function createBaseDeps() {
  const submitTask = vi.fn<
    (code: string, options?: { readonly idempotencyKey?: string }) => Promise<TaskSubmitResponse>
  >();
  const getTaskStatus = vi.fn<(taskId: number) => Promise<TaskStatusResponse>>();
  let callbacks: TaskStreamCallbacks | null = null;
  const close = vi.fn();
  const connectTaskStatusStream = vi.fn(
    (_taskIds: number[] | null, nextCallbacks: TaskStreamCallbacks): TaskStreamConnection => {
      callbacks = nextCallbacks;
      return { close };
    },
  );

  return {
    submitTask,
    getTaskStatus,
    connectTaskStatusStream,
    getCallbacks: () => callbacks,
    close,
  };
}

async function flushAsyncUpdates() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useTaskRuntime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses stream-first tracking and stops after terminal status", async () => {
    const deps = createBaseDeps();
    deps.submitTask.mockResolvedValue({
      task_id: 101,
      status: "PENDING",
      task_type: "code",
      deduplicated: false,
    });

    render(
      <HookHarness
        strategy="stream-first"
        deps={{
          submitTask: deps.submitTask,
          getTaskStatus: deps.getTaskStatus,
          connectTaskStatusStream: deps.connectTaskStatusStream,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "submit" }));
    await flushAsyncUpdates();

    expect(screen.getByTestId("task-id")).toHaveTextContent("101");
    expect(screen.getByTestId("tracking-mode")).toHaveTextContent("sse");
    expect(screen.getByTestId("is-tracking")).toHaveTextContent("true");

    act(() => {
      deps.getCallbacks()?.onStatus({
        task_id: 101,
        status: "RUNNING",
        updated_at: "2026-03-23T00:00:00Z",
        duration_ms: null,
        attempt_count: 1,
      });
    });

    expect(screen.getByTestId("task-status")).toHaveTextContent("RUNNING");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByTestId("elapsed-seconds")).toHaveTextContent("2");

    act(() => {
      deps.getCallbacks()?.onStatus({
        task_id: 101,
        status: "SUCCESS",
        updated_at: "2026-03-23T00:00:02Z",
        duration_ms: 2000,
        attempt_count: 1,
      });
    });
    await flushAsyncUpdates();

    expect(screen.getByTestId("tracking-mode")).toHaveTextContent("idle");
    expect(screen.getByTestId("is-tracking")).toHaveTextContent("false");
  });

  it("supports polling-only tracking and manual refresh when auto polling is disabled", async () => {
    const deps = createBaseDeps();
    deps.submitTask.mockResolvedValue({
      task_id: 202,
      status: "PENDING",
      task_type: "code",
      deduplicated: false,
    });
    deps.getTaskStatus.mockResolvedValue({ task_id: 202, status: "SUCCESS", task_type: "code" });

    render(
      <HookHarness
        strategy="polling-only"
        initialAutoPolling={false}
        deps={{
          submitTask: deps.submitTask,
          getTaskStatus: deps.getTaskStatus,
          connectTaskStatusStream: deps.connectTaskStatusStream,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "submit" }));
    await flushAsyncUpdates();

    expect(screen.getByTestId("tracking-mode")).toHaveTextContent("idle");
    expect(screen.getByTestId("auto-polling")).toHaveTextContent("false");
    expect(deps.connectTaskStatusStream).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(deps.getTaskStatus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "refresh" }));
    await flushAsyncUpdates();

    expect(deps.getTaskStatus).toHaveBeenCalledWith(202);
    expect(screen.getByTestId("task-status")).toHaveTextContent("SUCCESS");
    expect(screen.getByTestId("tracking-mode")).toHaveTextContent("idle");
  });
});
