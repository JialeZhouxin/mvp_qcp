import { act, fireEvent, render, screen } from "@testing-library/react";
import type { TaskStatusResponse, TaskSubmitResponse } from "../api/tasks";
import type { CircuitModel } from "../features/circuit/model/types";
import type { TaskStreamCallbacks, TaskStreamConnection } from "../features/realtime/task-stream-client";
import {
  useWorkbenchTaskSubmit,
  type UseWorkbenchTaskSubmitDeps,
} from "../features/circuit/submission/use-workbench-task-submit";

const MODEL: CircuitModel = {
  numQubits: 1,
  operations: [{ id: "op-1", gate: "x", targets: [0], layer: 0 }],
};

interface HookHarnessProps {
  readonly deps: Partial<UseWorkbenchTaskSubmitDeps>;
}

function HookHarness({ deps }: HookHarnessProps) {
  const {
    submittedTaskId,
    submittedTaskStatus,
    taskStatusLabel,
    trackingMode,
    isTracking,
    elapsedSeconds,
    onSubmitTask,
    onRefreshTaskStatus,
  } = useWorkbenchTaskSubmit({
    circuit: MODEL,
    parseError: null,
    deps,
  });

  return (
    <section>
      <button type="button" onClick={() => void onSubmitTask()}>
        submit
      </button>
      <button type="button" onClick={() => void onRefreshTaskStatus()}>
        refresh
      </button>
      <div data-testid="task-id">{submittedTaskId ?? "-"}</div>
      <div data-testid="task-status">{submittedTaskStatus ?? "-"}</div>
      <div data-testid="task-label">{taskStatusLabel}</div>
      <div data-testid="tracking-mode">{trackingMode}</div>
      <div data-testid="is-tracking">{String(isTracking)}</div>
      <div data-testid="elapsed-seconds">{elapsedSeconds}</div>
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

describe("useWorkbenchTaskSubmit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks task status via stream and stops on terminal status", async () => {
    const deps = createBaseDeps();
    deps.submitTask.mockResolvedValue({ task_id: 101, status: "PENDING", deduplicated: false });

    render(
      <HookHarness
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
        updated_at: "2026-03-17T00:00:00Z",
        duration_ms: null,
        attempt_count: 1,
      });
    });

    expect(screen.getByTestId("task-status")).toHaveTextContent("RUNNING");
    expect(screen.getByTestId("task-label")).toHaveTextContent("执行中");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByTestId("elapsed-seconds")).toHaveTextContent("2");

    act(() => {
      deps.getCallbacks()?.onStatus({
        task_id: 101,
        status: "SUCCESS",
        updated_at: "2026-03-17T00:00:02Z",
        duration_ms: 2000,
        attempt_count: 1,
      });
    });
    await flushAsyncUpdates();

    expect(screen.getByTestId("tracking-mode")).toHaveTextContent("idle");
    expect(screen.getByTestId("is-tracking")).toHaveTextContent("false");
  });

  it("falls back to polling when stream disconnects", async () => {
    const deps = createBaseDeps();
    deps.submitTask.mockResolvedValue({ task_id: 202, status: "PENDING", deduplicated: false });
    deps.getTaskStatus
      .mockResolvedValueOnce({ task_id: 202, status: "RUNNING" })
      .mockResolvedValueOnce({ task_id: 202, status: "SUCCESS" });

    render(
      <HookHarness
        deps={{
          submitTask: deps.submitTask,
          getTaskStatus: deps.getTaskStatus,
          connectTaskStatusStream: deps.connectTaskStatusStream,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "submit" }));
    await flushAsyncUpdates();

    expect(screen.getByTestId("tracking-mode")).toHaveTextContent("sse");

    act(() => {
      deps.getCallbacks()?.onDisconnect?.();
    });
    await flushAsyncUpdates();

    expect(screen.getByTestId("tracking-mode")).toHaveTextContent("polling");
    expect(screen.getByTestId("task-status")).toHaveTextContent("RUNNING");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    await flushAsyncUpdates();

    expect(screen.getByTestId("task-status")).toHaveTextContent("SUCCESS");
    expect(screen.getByTestId("tracking-mode")).toHaveTextContent("idle");
    expect(screen.getByTestId("is-tracking")).toHaveTextContent("false");
  });

  it("keeps manual refresh available while tracking", async () => {
    const deps = createBaseDeps();
    deps.submitTask.mockResolvedValue({ task_id: 303, status: "PENDING", deduplicated: false });
    deps.getTaskStatus.mockResolvedValue({ task_id: 303, status: "SUCCESS" });

    render(
      <HookHarness
        deps={{
          submitTask: deps.submitTask,
          getTaskStatus: deps.getTaskStatus,
          connectTaskStatusStream: deps.connectTaskStatusStream,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "submit" }));
    await flushAsyncUpdates();

    expect(screen.getByTestId("tracking-mode")).toHaveTextContent("sse");

    fireEvent.click(screen.getByRole("button", { name: "refresh" }));
    await flushAsyncUpdates();

    expect(screen.getByTestId("task-status")).toHaveTextContent("SUCCESS");
    expect(deps.getTaskStatus).toHaveBeenCalledWith(303);
    expect(screen.getByTestId("tracking-mode")).toHaveTextContent("idle");
  });
});
