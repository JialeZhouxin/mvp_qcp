# Design Document

## Overview

本设计实现三项能力的统一落地：

1. 任务中心：提供任务历史、筛选、详情查看
2. 实时进度：基于 SSE（Server-Sent Events）推送任务状态变化，断连自动回退轮询
3. 项目化保存 + 错误可诊断：支持代码/电路项目保存与恢复，并将失败信息升级为结构化中文诊断

设计原则是“复用现有链路、最小改动完成闭环”，避免引入新中间件或重型前端状态库。

## Steering Document Alignment

### Technical Standards (tech.md)

当前仓库未提供 `tech.md`，本设计遵循现有实现约定：
- 后端：FastAPI Router + Service + SQLModel 分层
- 前端：React 页面编排 + `src/api` 访问层 + `features` 功能模块
- 数据：继续使用 SQLite，避免本轮引入迁移框架或新数据库

### Project Structure (structure.md)

当前仓库未提供 `structure.md`，本设计沿用现有目录组织：
- 后端新增代码放在 `app/models`、`app/schemas`、`app/services`、`app/api`
- 前端新增代码放在 `src/pages`、`src/components`、`src/features`、`src/api`
- 测试延续 `backend/tests` 与 `frontend/src/tests`

## Code Reuse Analysis

### Existing Components to Leverage
- **`backend/app/api/tasks.py`**: 扩展现有任务接口，避免重复鉴权与会话处理逻辑
- **`backend/app/services/task_lifecycle.py`**: 复用任务状态与时长字段作为任务中心数据源
- **`backend/app/services/task_error_payload.py`**: 在现有 `code/message` 基础上扩展结构化诊断字段
- **`frontend/src/api/client.ts`**: 复用统一 API 请求与 Bearer Token 注入
- **`frontend/src/pages/TasksPage.tsx`**: 提取任务详情显示逻辑，避免双份任务状态渲染
- **`frontend/src/pages/CircuitWorkbenchPage.tsx`**: 复用已存在工作台状态管理与本地草稿能力

### Integration Points
- **任务执行链路**: 不改动 `submit -> queue -> worker` 主流程，仅增加“查询与通知”能力
- **数据库**: 新增 `Project` 表（独立表），`Task` 表仅查询扩展，不新增必需字段
- **鉴权体系**: 继续使用 Bearer Token；SSE 通过 `fetch` 流式读取以保留 Authorization Header

## Architecture

后端新增“任务查询/流式推送/项目服务/错误诊断”四个职责模块；前端新增“任务中心页面 + SSE 客户端 + 项目 API + 诊断展示”。

```mermaid
graph TD
    U[用户] --> FE[TaskCenterPage / CodePage / CircuitPage]
    FE --> API1[GET /api/tasks]
    FE --> API2[GET /api/tasks/{id}/detail]
    FE --> API3[GET /api/tasks/stream]
    FE --> API4[PUT /api/projects/{name}]
    FE --> API5[GET /api/projects]
    API1 --> TS[TaskQueryService]
    API2 --> TS
    API3 --> ES[TaskEventStreamService]
    API4 --> PS[ProjectService]
    API5 --> PS
    TS --> DB[(SQLite Task)]
    ES --> DB
    PS --> DB2[(SQLite Project)]
    TS --> DIAG[ErrorDiagnosticService]
    DIAG --> FE
```

### Modular Design Principles
- **Single File Responsibility**: SSE 编码、任务查询、项目存储、错误映射拆分为独立服务文件
- **Component Isolation**: 任务中心页面分为 `TaskList`、`TaskDetail`、`ProjectList` 三个组件
- **Service Layer Separation**: API 只编排请求/响应，业务规则在 Service 层
- **Utility Modularity**: 前端 SSE 解析和状态标签映射独立为工具模块

## Components and Interfaces

### Component 1: Task Query API
- **Purpose:** 为任务中心提供分页列表与详情数据
- **Interfaces:**
  - `GET /api/tasks?status=&limit=&offset=`
  - `GET /api/tasks/{task_id}/detail`
- **Dependencies:** `Task`, `Session`, `TaskQueryService`, `ErrorDiagnosticService`
- **Reuses:** `get_current_user`, `_load_user_task_or_404`

### Component 2: Task Stream API (SSE)
- **Purpose:** 推送任务状态变更事件与连接心跳
- **Interfaces:**
  - `GET /api/tasks/stream?task_ids=1,2,3`（可选筛选）
  - 事件格式：`event: task_status`, `data: { task_id, status, updated_at, duration_ms, attempt_count }`
- **Dependencies:** `StreamingResponse`, `TaskEventStreamService`
- **Reuses:** 任务查询逻辑与鉴权机制

### Component 3: Project API
- **Purpose:** 支持代码/电路项目的保存、列表与恢复
- **Interfaces:**
  - `PUT /api/projects/{name}`（同名 upsert）
  - `GET /api/projects`
  - `GET /api/projects/{project_id}`
- **Dependencies:** `Project` model, `ProjectService`
- **Reuses:** 统一 `Session` 与鉴权

### Component 4: Error Diagnostic Service
- **Purpose:** 将执行错误标准化为“阶段 + 中文建议”
- **Interfaces:**
  - `build_error_payload(code, message)` 返回 `{code, message, phase, summary, suggestions}`
  - `to_user_diagnostic(error_payload)` 返回前端可渲染结构
- **Dependencies:** 现有错误码（ExecutionBackendError/QiboExecutionError）
- **Reuses:** `task_error_payload.py`

### Component 5: TaskCenterPage
- **Purpose:** 统一承载任务历史、筛选、实时进度、任务详情、项目列表入口
- **Interfaces:** 路由 `/tasks/center`
- **Dependencies:** `api/tasks-center.ts`, `api/projects.ts`, `features/realtime/task-stream-client.ts`
- **Reuses:** `ProtectedRoute`、现有样式与错误文案风格

## Data Models

### Model 1: Project
```text
Project
- id: int (PK)
- user_id: int (index, owner)
- name: str (1..80, unique with user_id)
- entry_type: str ("code" | "circuit")
- payload_json: str (serialized project payload)
- last_task_id: int | null
- created_at: datetime
- updated_at: datetime
```

### Model 2: TaskCenterListItem (response DTO)
```text
TaskCenterListItem
- task_id: int
- status: str
- created_at: datetime
- updated_at: datetime
- duration_ms: int | null
- attempt_count: int
- has_result: bool
```

### Model 3: TaskDiagnostic (response DTO)
```text
TaskDiagnostic
- code: str
- message: str
- phase: str ("SUBMIT" | "QUEUE" | "EXECUTION" | "RESULT")
- summary: str
- suggestions: list[str]
```

## Error Handling

### Error Scenarios
1. **Scenario 1: SSE 连接中断**
   - **Handling:** 前端显示“实时连接已断开”，自动启动轮询；后端结束流并允许重连
   - **User Impact:** 用户仍可看到最新状态，但刷新频率降级

2. **Scenario 2: 项目保存冲突或载荷非法**
   - **Handling:** 后端返回结构化 `400`（字段错误）或执行 upsert 覆盖；前端提示明确中文文案
   - **User Impact:** 用户知道是否保存成功，或知道需要修正的字段

3. **Scenario 3: 任务失败无可读解释**
   - **Handling:** 后端统一返回 `diagnostic`；前端优先展示建议动作，保留原始错误码供追踪
   - **User Impact:** 用户可直接执行修复步骤而非重复盲试

## Testing Strategy

### Unit Testing
- 后端：
  - `ProjectService`（upsert、用户隔离、payload 校验）
  - `ErrorDiagnosticService`（错误码映射完整性）
  - `TaskEventStreamService`（变更检测与心跳输出）
- 前端：
  - SSE 解析器（分片数据、断连重试）
  - 任务状态映射与错误展示组件

### Integration Testing
- 后端 API：
  - 任务列表筛选与详情权限校验
  - 项目保存/列表/读取全链路
  - SSE 事件输出格式与鉴权校验
- 前端：
  - 任务中心页面在“实时在线/断连回退”下的数据一致性

### End-to-End Testing
- 用户场景 1：提交任务 -> 进入任务中心 -> 实时看到终态 -> 查看诊断
- 用户场景 2：在代码页保存项目 -> 在任务中心打开项目 -> 回到代码页恢复内容
- 用户场景 3：在电路页保存项目 -> 从任务中心恢复 -> 本地仿真与图表正常更新
