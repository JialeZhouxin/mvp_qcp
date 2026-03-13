# Tasks Document

- [x] 1. 新增项目持久化数据模型与请求响应 Schema
  - File: `backend/app/models/project.py`
  - File: `backend/app/models/__init__.py`
  - File: `backend/app/schemas/project.py`
  - 定义 `Project` 表（user_id + name 唯一、entry_type、payload_json、last_task_id、时间戳）
  - 定义项目保存/列表/详情所需 Pydantic schema
  - Purpose: 为项目化保存提供稳定数据契约
  - _Leverage: `backend/app/models/task.py`, `backend/app/schemas/task.py`_
  - _Requirements: 3.1, 3.2, 3.4_
  - _Prompt: Implement the task for spec task-center-realtime-project-diagnostics, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Python Engineer | Task: Add a new Project SQLModel and project schemas for save/list/detail payloads following requirement 3.1/3.2/3.4 and existing model/schema conventions | Restrictions: Do not introduce migration framework, do not modify existing task/auth schemas incompatibly, keep fields minimal for MVP | _Leverage: backend/app/models/task.py, backend/app/schemas/task.py | _Requirements: 3.1, 3.2, 3.4 | Success: Project model is discoverable by metadata init, schemas validate both code and circuit payload envelopes, no breaking changes to existing APIs. Before coding set this task to [-] in tasks.md, after completion log implementation via log-implementation with artifacts, then mark task as [x]._

- [x] 2. 实现项目服务层（upsert/list/get）
  - File: `backend/app/services/project_service.py`
  - File: `backend/app/services/__init__.py`（如无则忽略）
  - 实现按用户隔离的项目保存（同名覆盖）、列表与详情读取
  - Purpose: 将项目业务规则集中在 Service 层
  - _Leverage: `backend/app/services/task_lifecycle.py`_
  - _Requirements: 3.1, 3.3, 3.4, 5.1_
  - _Prompt: Implement the task for spec task-center-realtime-project-diagnostics, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Service Engineer | Task: Build ProjectService with user-scoped upsert/list/get operations and lightweight payload validation | Restrictions: Do not leak cross-user projects, do not place SQL logic in API router, avoid overly generic abstractions (YAGNI) | _Leverage: backend/app/services/task_lifecycle.py patterns | _Requirements: 3.1, 3.3, 3.4, 5.1 | Success: Service methods are deterministic, enforce ownership checks, and cleanly separate persistence from route handlers. Before coding set this task to [-] in tasks.md, after completion log implementation via log-implementation with artifacts, then mark task as [x]._

- [x] 3. 新增项目 API 路由并接入主应用
  - File: `backend/app/api/projects.py`
  - File: `backend/app/api/__init__.py`
  - File: `backend/app/main.py`
  - 提供 `PUT /api/projects/{name}`、`GET /api/projects`、`GET /api/projects/{id}`
  - Purpose: 对外暴露项目化保存能力
  - _Leverage: `backend/app/api/tasks.py`, `backend/app/api/auth.py`_
  - _Requirements: 3.1, 3.2, 3.3, 5.1_
  - _Prompt: Implement the task for spec task-center-realtime-project-diagnostics, first run spec-workflow-guide to get the workflow guide then implement the task: Role: FastAPI API Engineer | Task: Add project CRUD-lite routes and wire router registration using current auth/session dependency style | Restrictions: Do not bypass get_current_user, do not return raw ORM objects, preserve existing route prefixes and error style | _Leverage: backend/app/api/tasks.py, backend/app/api/auth.py | _Requirements: 3.1, 3.2, 3.3, 5.1 | Success: All project endpoints are reachable under /api/projects with owner isolation and schema-driven responses. Before coding set this task to [-] in tasks.md, after completion log implementation via log-implementation with artifacts, then mark task as [x]._

- [x] 4. 新增任务中心查询 Schema 与服务
  - File: `backend/app/schemas/task_center.py`
  - File: `backend/app/services/task_query_service.py`
  - 定义列表项、分页响应、详情响应（含诊断信息）
  - Purpose: 统一任务中心查询逻辑，避免在路由重复拼装
  - _Leverage: `backend/app/models/task.py`, `backend/app/schemas/task.py`_
  - _Requirements: 1.1, 1.2, 1.3, 4.1_
  - _Prompt: Implement the task for spec task-center-realtime-project-diagnostics, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Query Engineer | Task: Create task-center schemas and a query service for filtered task listing and detail retrieval with diagnostic projection | Restrictions: Do not duplicate ownership checks in multiple places, keep list query paginated, do not change existing /api/tasks response contracts | _Leverage: backend/app/models/task.py, backend/app/schemas/task.py | _Requirements: 1.1, 1.2, 1.3, 4.1 | Success: TaskQueryService returns stable DTOs and supports status filtering + reverse chronological order with owner enforcement. Before coding set this task to [-] in tasks.md, after completion log implementation via log-implementation with artifacts, then mark task as [x]._

- [x] 5. 实现错误可诊断映射与结构化输出
  - File: `backend/app/services/error_diagnostic_service.py`
  - File: `backend/app/services/task_error_payload.py`
  - 将错误扩展为 `{code,message,phase,summary,suggestions}`
  - Purpose: 提供可执行的中文诊断信息
  - _Leverage: `backend/app/services/execution/base.py`, `backend/app/worker/tasks.py`_
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - _Prompt: Implement the task for spec task-center-realtime-project-diagnostics, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Reliability Engineer | Task: Introduce structured diagnostic mapping for task errors and extend payload builder with phase/summary/suggestions fields | Restrictions: Do not hide original error code, do not silently fallback to fake success, keep mapping explicit and testable | _Leverage: backend/app/services/execution/base.py, backend/app/worker/tasks.py | _Requirements: 4.1, 4.2, 4.3, 4.4 | Success: Failed tasks now persist structured diagnostics consumable by frontend with Chinese actionable suggestions. Before coding set this task to [-] in tasks.md, after completion log implementation via log-implementation with artifacts, then mark task as [x]._

- [x] 6. 新增任务中心 API 与 SSE 实时通道
  - File: `backend/app/api/tasks_center.py`
  - File: `backend/app/api/__init__.py`
  - File: `backend/app/main.py`
  - 提供 `GET /api/tasks`（列表）、`GET /api/tasks/{id}/detail`、`GET /api/tasks/stream`
  - Purpose: 交付任务中心与实时进度的后端能力
  - _Leverage: `backend/app/api/tasks.py`, `backend/app/services/task_query_service.py`_
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.4_
  - _Prompt: Implement the task for spec task-center-realtime-project-diagnostics, first run spec-workflow-guide to get the workflow guide then implement the task: Role: FastAPI Streaming Engineer | Task: Add task-center REST endpoints and SSE status stream endpoint with auth and optional task_ids filter | Restrictions: Do not break existing /api/tasks submit/status/result routes, keep SSE payload compact, do not introduce Redis pubsub dependency in this iteration | _Leverage: backend/app/api/tasks.py, backend/app/services/task_query_service.py | _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.4 | Success: Frontend can fetch task history/details and receive status updates via SSE with reconnect-friendly behavior. Before coding set this task to [-] in tasks.md, after completion log implementation via log-implementation with artifacts, then mark task as [x]._

- [x] 7. 补充后端测试覆盖（项目、任务中心、诊断）
  - File: `backend/tests/test_task_center_api.py`
  - File: `backend/tests/test_project_api.py`
  - File: `backend/tests/test_error_diagnostics.py`
  - 覆盖鉴权隔离、列表筛选、SSE 基础事件、项目 upsert 与诊断字段
  - Purpose: 保证新增能力可回归验证
  - _Leverage: `backend/tests/test_mvp_smoke.py`, `backend/tests/test_task_reliability.py`_
  - _Requirements: 1.4, 2.3, 3.3, 4.1, 4.2_
  - _Prompt: Implement the task for spec task-center-realtime-project-diagnostics, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend QA Engineer | Task: Add focused API and service tests for task-center/project/diagnostics flows with owner isolation and fallback expectations | Restrictions: Do not rely on external Redis/docker services for unit-level tests, keep each test deterministic, respect 60s backend test timeout policy | _Leverage: backend/tests/test_mvp_smoke.py, backend/tests/test_task_reliability.py | _Requirements: 1.4, 2.3, 3.3, 4.1, 4.2 | Success: New tests validate critical paths and catch regression in status visibility, project persistence, and diagnostic payload shape. Before coding set this task to [-] in tasks.md, after completion log implementation via log-implementation with artifacts, then mark task as [x]._

- [x] 8. 新增前端任务中心与项目 API 客户端
  - File: `frontend/src/api/task-center.ts`
  - File: `frontend/src/api/projects.ts`
  - File: `frontend/src/features/realtime/task-stream-client.ts`
  - 实现列表/详情/项目接口与 SSE 客户端（支持断连回调）
  - Purpose: 给前端页面提供统一数据访问层
  - _Leverage: `frontend/src/api/client.ts`, `frontend/src/api/tasks.ts`_
  - _Requirements: 1.1, 2.1, 2.3, 3.1, 3.2_
  - _Prompt: Implement the task for spec task-center-realtime-project-diagnostics, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend API Engineer | Task: Implement task-center/project API wrappers and an SSE client with disconnect/reconnect notifications and typed events | Restrictions: Do not duplicate generic fetch logic already in api/client.ts, keep API typing explicit, do not introduce external state libs | _Leverage: frontend/src/api/client.ts, frontend/src/api/tasks.ts | _Requirements: 1.1, 2.1, 2.3, 3.1, 3.2 | Success: Frontend can consume list/detail/project endpoints and live task status stream through stable utilities. Before coding set this task to [-] in tasks.md, after completion log implementation via log-implementation with artifacts, then mark task as [x]._

- [x] 9. 实现任务中心页面与实时进度展示
  - File: `frontend/src/pages/TaskCenterPage.tsx`
  - File: `frontend/src/components/task-center/TaskListPanel.tsx`
  - File: `frontend/src/components/task-center/TaskDetailPanel.tsx`
  - 展示任务列表筛选、详情、SSE 状态变化与断连回退提示
  - Purpose: 提供统一任务管理入口
  - _Leverage: `frontend/src/pages/TasksPage.tsx`, `frontend/src/components/circuit/WorkbenchResultPanel.tsx`_
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.3, 5.2_
  - _Prompt: Implement the task for spec task-center-realtime-project-diagnostics, first run spec-workflow-guide to get the workflow guide then implement the task: Role: React Frontend Engineer | Task: Build TaskCenterPage with list/filter/detail and live status updates plus explicit fallback polling indicator | Restrictions: Do not create a monolithic page component beyond maintainable complexity, keep Chinese UX copy consistent, avoid hidden fallback behavior | _Leverage: frontend/src/pages/TasksPage.tsx, frontend/src/components/circuit/WorkbenchResultPanel.tsx | _Requirements: 1.1, 1.2, 1.3, 2.1, 2.3, 5.2 | Success: Users can manage tasks in one place and observe real-time status with clear degraded-mode feedback. Before coding set this task to [-] in tasks.md, after completion log implementation via log-implementation with artifacts, then mark task as [x]._

- [x] 10. 打通项目化保存到代码模式与电路模式
  - File: `frontend/src/pages/TasksPage.tsx`
  - File: `frontend/src/pages/CircuitWorkbenchPage.tsx`
  - File: `frontend/src/components/task-center/ProjectPanel.tsx`
  - 在两个入口提供“保存项目”并支持从任务中心恢复
  - Purpose: 保证双入口操作语义一致
  - _Leverage: `frontend/src/features/circuit/ui/draft-storage.ts`, `frontend/src/pages/CodeTasksPage.tsx`_
  - _Requirements: 3.1, 3.2, 3.3, 5.1_
  - _Prompt: Implement the task for spec task-center-realtime-project-diagnostics, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-stack Frontend Engineer | Task: Add project save integration for code and circuit pages, and expose project restore through a shared panel used by task center | Restrictions: Do not remove existing local draft behavior, avoid incompatible payload formats between two entry modes, keep save UX explicit | _Leverage: frontend/src/features/circuit/ui/draft-storage.ts, frontend/src/pages/CodeTasksPage.tsx | _Requirements: 3.1, 3.2, 3.3, 5.1 | Success: Users can save and reopen both code and circuit projects with consistent interactions and correct content restoration. Before coding set this task to [-] in tasks.md, after completion log implementation via log-implementation with artifacts, then mark task as [x]._

- [x] 11. 前端错误可诊断展示与路由整合
  - File: `frontend/src/App.tsx`
  - File: `frontend/src/api/errors.ts`
  - File: `frontend/src/pages/TasksPage.tsx`
  - 接入 `/tasks/center` 路由并将结构化诊断转换为中文可执行提示
  - Purpose: 让用户在失败时快速得到修复路径
  - _Leverage: `frontend/src/pages/CircuitWorkbenchPage.tsx`, `frontend/src/pages/CodeTasksPage.tsx`_
  - _Requirements: 4.2, 4.3, 4.4, 5.1, 5.2, 5.3_
  - _Prompt: Implement the task for spec task-center-realtime-project-diagnostics, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend UX Engineer | Task: Wire task-center route and implement structured diagnostic rendering so users see Chinese reason plus actionable steps instead of raw payload | Restrictions: Do not drop raw error code needed for troubleshooting, do not regress existing submit/status/result flow, keep terminology consistent across pages | _Leverage: frontend/src/pages/CircuitWorkbenchPage.tsx, frontend/src/pages/CodeTasksPage.tsx | _Requirements: 4.2, 4.3, 4.4, 5.1, 5.2, 5.3 | Success: Diagnostic UI clearly distinguishes user-side and platform-side failures and guides next actions with consistent Chinese copy. Before coding set this task to [-] in tasks.md, after completion log implementation via log-implementation with artifacts, then mark task as [x]._

- [x] 12. 补充前端测试与文档更新
  - File: `frontend/src/tests/task-center-page.test.tsx`
  - File: `frontend/src/tests/project-api.test.ts`
  - File: `README.md`
  - 覆盖任务中心展示、SSE 回退行为、项目保存恢复；补充使用说明
  - Purpose: 固化可验证行为与用户使用路径
  - _Leverage: `frontend/src/tests/workbench-page.test.tsx`, `docs/project-status-and-usage.md`_
  - _Requirements: 2.3, 3.3, 4.2, 5.3_
  - _Prompt: Implement the task for spec task-center-realtime-project-diagnostics, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend QA Engineer | Task: Add tests for task-center realtime/fallback and project save-restore flows, then update README usage section for new entry and operations | Restrictions: Do not write brittle timing-only tests, keep docs aligned with actual routes/API, avoid speculative future features in docs | _Leverage: frontend/src/tests/workbench-page.test.tsx, docs/project-status-and-usage.md | _Requirements: 2.3, 3.3, 4.2, 5.3 | Success: Tests pass in current frontend setup and documentation clearly explains how to use task center, realtime updates, and project save/restore. Before coding set this task to [-] in tasks.md, after completion log implementation via log-implementation with artifacts, then mark task as [x]._
