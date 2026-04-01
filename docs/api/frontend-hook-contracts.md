# 前端 Hook 消费契约（对外边界）

本文件定义“被页面/组件消费”的 Hook 契约，而非内部实现细节。

## 1. 通用任务运行时

## 1.1 `useTaskRuntime`（`features/task-runtime/use-task-runtime.ts`）

入参关键项：

- `trackingStrategy`: `"stream-first" | "polling-only"`
- `submitErrorHint` / `statusRefreshErrorHint`
- `deps`（可注入 API 与定时器依赖，便于测试）

核心返回：

- 状态：`taskId`、`taskStatus`、`taskStatusLabel`
- 控制：`submitTaskCode`、`submitTaskRequest`、`refreshTaskStatus`
- 跟踪：`trackingMode`、`elapsedSeconds`、`isTracking`
- 其他：`submittingTask`、`taskError`、`deduplicatedSubmit`

契约语义：

- `stream-first`：优先 SSE，失败降级轮询。
- `polling-only`：纯轮询。
- 提交成功后自动进入状态跟踪，终态自动停止跟踪。

## 1.2 `useTaskStatusTracking`（`features/task-runtime/use-task-status-tracking.ts`）

核心返回：

- `startTracking(taskId, status)`
- `stopTracking()`
- `resetTracking()`
- `pollTaskStatus(taskId)`
- `trackingMode: "idle" | "sse" | "polling"`

语义：

- SSE `onError/onDisconnect` 会触发轮询兜底。

## 2. 代码任务页 Hook

## 2.1 `useCodeTaskRun(code)`（`features/code-tasks/useCodeTaskRun.ts`）

核心返回：

- 任务：`taskId`、`status`、`loading`
- 结果：`resultText`、`probabilities`
- 错误：`error`、`diagnosticText`
- 操作：`submitCurrentCode`、`loadResult`、`refreshTaskStatus`

业务语义：

- 成功态自动拉取结果。
- 失败态自动拉取任务诊断（来自任务中心详情）。

## 2.2 `useCodeProjects(...)`（`features/code-tasks/useCodeProjects.ts`）

入参：

- `code`
- `taskId`
- `onProjectLoaded(code)`

核心返回：

- 状态：`projectLoading`、`projectSaving`、`projectError`、`projectSuccess`
- 数据：`projects`
- 操作：`loadProjects`、`saveCurrentProject(name)`、`loadProjectById(id)`

## 3. 任务中心页 Hook

## 3.1 `useTaskCenterList()`

返回：

- `tasks`
- `statusFilter` / `setStatusFilter`
- `listLoading` / `listError`
- `refreshList(filter?)`
- `applyTaskStatusEvent(event)`

语义：

- `statusFilter` 默认 `"ALL"`（仅前端语义）。
- `applyTaskStatusEvent` 只更新已存在行，不主动插入新任务。

## 3.2 `useTaskCenterDetail()`

返回：

- `selectedTaskId` / `setSelectedTaskId`
- `detail`
- `detailLoading` / `detailError`
- `refreshDetail(taskId?)`

## 3.3 `useTaskCenterRealtime(...)`

入参：

- `statusFilter`
- `selectedTaskId`
- `refreshList`
- `refreshDetail`
- `onTaskStatus`

返回：

- `streamDisconnected`
- `reconnect()`

语义：

- 默认订阅全量任务流（`taskIds=null`）。
- 断流后启动 3 秒轮询兜底，同时刷新列表与当前详情。

## 4. 图形化工作台 Hook

## 4.1 `useWorkbenchTaskSubmit(...)`（`features/circuit/submission/use-workbench-task-submit.ts`）

入参：

- `circuit`
- `parseError`
- 可选 `deps`（支持注入 `submitCircuitTask` 与 runtime 依赖）

核心返回：

- 状态：`submittingTask`、`submittedTaskId`、`submittedTaskStatus`
- 交互：`taskStatusLabel`、`submitError`、`deduplicatedSubmit`
- 跟踪：`trackingMode`、`isTracking`、`elapsedSeconds`
- 能力：`canSubmit`、`onSubmitTask`、`onRefreshTaskStatus`

语义：

- 先做本地校验（QASM 与电路模型）再提交。
- 使用指纹生成 `Idempotency-Key`，避免重复提交。
- 跟踪策略固定为 `stream-first`。

## 4.2 `useWorkbenchProjects(...)`（`features/circuit/ui/use-workbench-projects.ts`）

入参：

- `circuit` / `qasm` / `displayMode`
- `onProjectLoaded(payload)`

核心返回：

- `projectLoading`、`projectSaving`、`projectError`、`projectSuccess`
- `projects`
- `loadProjects`、`saveCurrentProject(name)`、`loadProjectById(id)`

语义：

- 保存时固定 `entry_type: "circuit"`，并持久化 `display_mode`。
