# 后端 HTTP 契约

## 1. 认证模块（`/api/auth`）

实现位置：`backend/app/api/auth.py`

| 方法 | 路径 | 鉴权 | 请求体 | 响应体 | 主要错误 |
|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | 否 | `RegisterRequest` | `RegisterResponse` | `409` 用户名已存在 |
| `POST` | `/api/auth/login` | 否 | `LoginRequest` | `LoginResponse` | `401` 账号或密码错误 |

### 字段约束

- `username`：长度 `3..50`
- `password`：长度 `6..128`
- `LoginResponse.token_type`：默认 `Bearer`

### 鉴权行为

- 保护接口统一通过 `get_current_user` 校验 Bearer Token。
- 缺失/格式错误 token：`401`，`detail="missing bearer token"`。
- 无效或过期 token：`401`（`invalid token` / `token expired`）。
- 当前策略为单会话：同一用户新登录会覆盖旧 token。

## 2. 项目模块（`/api/projects`）

实现位置：`backend/app/api/projects.py`

| 方法 | 路径 | 鉴权 | 请求体 | 响应体 | 主要错误 |
|---|---|---|---|---|---|
| `PUT` | `/api/projects/{name}` | 是 | `ProjectSaveRequest` | `ProjectDetailResponse` | `400` 参数错误 |
| `GET` | `/api/projects?limit&offset` | 是 | 无 | `ProjectListResponse` | `422` 查询参数越界 |
| `GET` | `/api/projects/{project_id}` | 是 | 无 | `ProjectDetailResponse` | `404` 项目不存在 |

### 业务语义

- `PUT /{name}` 为 upsert：同一 `(tenant_id, user_id, name)` 更新，否则创建。
- `name` 服务端会 `trim`，空字符串或超过 80 字符会报 `400`。
- `entry_type` 必须是 `code` 或 `circuit`。
- `payload` 随 `entry_type` 变化：
  - `code`：至少包含 `code: string`
  - `circuit`：至少包含 `circuit`、`qasm`、`display_mode(FILTERED|ALL)`

## 3. 任务提交与查询模块（`/api/tasks`）

实现位置：`backend/app/api/tasks.py`

| 方法 | 路径 | 鉴权 | 请求体 | 响应体 | 主要错误 |
|---|---|---|---|---|---|
| `POST` | `/api/tasks/submit` | 是 | `TaskSubmitRequest` | `TaskSubmitResponse` | `400` 校验失败；`503` 队列不可用 |
| `POST` | `/api/tasks/circuit/submit` | 是 | `CircuitTaskSubmitRequest` | `TaskSubmitResponse` | `400` 载荷非法；`503` 执行器/队列不可用 |
| `GET` | `/api/tasks/{task_id}` | 是 | 无 | `TaskStatusResponse` | `404` 任务不存在或无权限 |
| `GET` | `/api/tasks/{task_id}/result` | 是 | 无 | `TaskResultResponse` | `404` 任务不存在或无权限 |

### `submit`（代码任务）

- 请求体：`{ code: string(1..20000) }`
- 可选请求头：`Idempotency-Key`（去重键）
- 成功响应：`task_id/status/task_type/deduplicated`
- 典型错误：
  - `400 detail={code,message}`，如 `INVALID_TASK_CODE`、`INVALID_IDEMPOTENCY_KEY`
  - `503 detail={code,message}`，如 `QUEUE_OVERLOADED`、`QUEUE_PUBLISH_ERROR`

### `circuit/submit`（电路任务）

- 先检查电路执行器心跳，不可用直接 `503`：
  - `detail.code = CIRCUIT_EXECUTOR_UNAVAILABLE`
- 载荷先做标准化校验，不通过 `400`：
  - `detail.code = INVALID_CIRCUIT_PAYLOAD`
- 支持门集合由服务端白名单约束（含单量子位门、受控门、多量子位门、参数门）。

### 查询接口语义

- `GET /{task_id}` 返回当前状态，`error_message` 为对象或 `null`。
- `GET /{task_id}/result`：
  - 运行中：`message="task not finished"`
  - 失败态：`message="task failed"`
  - 成功态：`message=null` 且 `result` 有效

## 4. 任务中心查询模块（`/api/tasks`）

实现位置：`backend/app/api/tasks_center.py`

| 方法 | 路径 | 鉴权 | 查询参数 | 响应体 | 主要错误 |
|---|---|---|---|---|---|
| `GET` | `/api/tasks` | 是 | `status?` `limit` `offset` | `TaskCenterListResponse` | `400` 状态过滤非法 |
| `GET` | `/api/tasks/{task_id}/detail` | 是 | 无 | `TaskCenterDetailResponse` | `404` 任务不存在 |

### 过滤语义

- `status` 取值需是后端状态枚举之一（`PENDING` 等）。
- 空字符串按无过滤处理。
- 前端的 `ALL` 只是 UI 层语义，不能直接传给后端。

### 诊断字段语义

- 详情中的 `diagnostic` 来自错误载荷归一化，包含：
  - `code`、`message`
  - `phase`（`SUBMIT/QUEUE/EXECUTION/RESULT`）
  - `summary`
  - `suggestions[]`

## 5. 可观测性模块

实现位置：`backend/app/api/health.py`、`backend/app/api/metrics.py`

| 方法 | 路径 | 鉴权 | 响应 | 主要错误 |
|---|---|---|---|---|
| `GET` | `/api/health` | 否 | 存活状态 | 无 |
| `GET` | `/api/health/live` | 否 | 存活状态 | 无 |
| `GET` | `/api/health/ready` | 否 | 就绪状态与依赖检查 | 未就绪时 `503` |
| `GET` | `/api/metrics` | 否 | Prometheus 文本格式 | 无 |

### 就绪检查说明

- `ready` 聚合检查：`database`、`redis`、`execution_backend`。
- 对外错误信息已脱敏：依赖异常统一为 `"dependency unavailable"`。

## 6. 错误体约定（主 API）

- 常规 FastAPI 错误：`{ "detail": <string | object> }`
- 任务提交类错误：`detail` 常为 `{code, message}`
- 前端 `apiRequest` 对 `detail` 为对象时会 `JSON.stringify` 成 `Error.message`
