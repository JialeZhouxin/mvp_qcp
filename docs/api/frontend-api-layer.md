# 前端 API 适配层契约（`frontend/src/api`）

## 1. 目标与边界

该层职责是“协议适配”，不承载页面状态机：

- 统一 HTTP 请求、鉴权头、错误映射
- 暴露与后端一一对应的函数接口
- 复用 `generated/contracts.ts` 的类型定义

核心文件：

- `client.ts`：通用请求入口
- `auth.ts` / `projects.ts` / `tasks.ts` / `task-center.ts` / `task-stream.ts`
- `generated/contracts.ts`：由后端 OpenAPI 生成

## 2. 通用请求契约（`client.ts`）

### `apiRequest<T>(path, options)`

- Base URL：`VITE_API_BASE_URL`，默认 `http://127.0.0.1:8000`
- 默认头：`Content-Type: application/json`
- `withAuth=true` 时自动注入 `Authorization: Bearer <token>`
  - token 来源：`auth/session-store.ts` -> `localStorage["qcp_access_token"]`

### 错误行为

- 对非 2xx 响应：
  - 尝试读取 `payload.detail`
  - `detail` 为字符串 -> 直接抛出
  - `detail` 为对象 -> `JSON.stringify(detail)` 后抛出

## 3. 各模块 API 函数

## 3.1 认证（`auth.ts`）

- `register(payload: RegisterPayload): Promise<RegisterResponse>`
- `login(payload: LoginPayload): Promise<LoginResponse>`

## 3.2 项目（`projects.ts`）

- `saveProject(name, payload): Promise<ProjectDetail>`
- `getProjectList(limit=20, offset=0): Promise<ProjectListResponse>`
- `getProjectDetail(projectId): Promise<ProjectDetail>`

## 3.3 任务（`tasks.ts`）

- `submitTask(code, {idempotencyKey?}): Promise<TaskSubmitResponse>`
- `submitCircuitTask(payload, {idempotencyKey?}): Promise<TaskSubmitResponse>`
- `getTaskStatus(taskId): Promise<TaskStatusResponse>`
- `getTaskResult(taskId): Promise<TaskResultResponse>`

说明：

- 仅任务提交接口支持 `Idempotency-Key` 透传。

## 3.4 任务中心（`task-center.ts`）

- `getTaskCenterList({status?, limit?, offset?}): Promise<TaskCenterListResponse>`
- `getTaskCenterDetail(taskId): Promise<TaskCenterDetailResponse>`

说明：

- `status` 不传等价于“全部”。

## 3.5 实时流（`task-stream.ts`）

- `subscribeTaskStream(taskIds, callbacks): TaskStreamConnection`
- 回调契约：
  - `onStatus(event: TaskStatusStreamEvent)`
  - `onHeartbeat?(event: TaskHeartbeatEvent)`
  - `onDisconnect?()`
  - `onError?(error: Error)`

行为语义：

- 使用 `fetch + ReadableStream` 手动解析 SSE block。
- block 按 `\n\n` 分帧，支持事件：
  - `task_status`
  - `heartbeat`
- `close()` 调用后会 `AbortController.abort()`。

## 4. 生成类型契约（`generated/contracts.ts`）

- 文件由脚本生成，不允许手工编辑。
- 当前类型覆盖：
  - 认证、项目、任务、任务中心
  - SSE 事件与 `TaskStreamMessage` 联合类型
