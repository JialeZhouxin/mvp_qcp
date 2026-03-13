# Quantum Cloud Platform MVP（Qibo）项目说明文档

## 1. 项目概述

本项目是量子计算云平台 MVP，实现了从用户鉴权到量子任务执行再到结果可视化的最小闭环：

1. 用户注册/登录并获取 Token
2. 在线提交 Python 量子脚本
3. 后端将任务异步入队（Redis + RQ）
4. Worker 在受限环境执行脚本并产出标准化结果
5. 前端轮询任务状态并展示概率分布图

后端量子执行引擎已统一为 **Qibo**。

### 1.1 前端双入口（2026-03 图形化升级）

当前前端提供两个受保护入口：

1. `http://127.0.0.1:5173/tasks/circuit`  
   图形化量子工作台（左侧拖拽电路，右侧 OpenQASM 3，可编辑并实时本地仿真）。
2. `http://127.0.0.1:5173/tasks/code`  
   原有代码提交模式（保留兼容）。

## 2. 当前开发进度

### 2.1 已完成

1. 基础工程结构（frontend/backend/scripts）
2. 后端核心模块
   - FastAPI 应用入口与健康检查
   - SQLite + SQLModel 数据层（User、Task）
   - 轻量鉴权（register/login/token）
   - 任务 API（submit/status/result）
   - RQ Worker 与任务状态流转
   - Qibo 受限执行器（含 AST 校验、超时、结果标准化）
3. 前端核心模块
   - 登录/注册/任务页路由（`/tasks/circuit` + `/tasks/code`）
   - 图形化量子工作台（GatePalette + CircuitCanvas + QasmEditorPane）
   - OpenQASM 3 子集解析与双向桥接
   - 浏览器 Web Worker 本地仿真调度
   - Token 注入 API 客户端
   - Monaco 编辑器接入
   - ECharts 概率直方图展示
   - 自动轮询与手动刷新
4. 测试与脚本
   - 后端 smoke + 任务流转集成测试
   - 前端 Vitest 测试文件（已接入）
   - 前端受限环境下 Node 单进程测试（`test:node`）
   - 一键启动脚本与联调健康检查脚本

### 2.2 未完成 / 待完善

1. 生产级安全沙箱（当前为 MVP 受限执行）
2. 任务执行资源隔离强化（CPU/内存更细粒度限制）
3. 前端 UI 风格与交互细节优化
4. Vitest 测试筛选配置优化（避免 `tests-node/*.test.mjs` 被 Vitest 扫描）

## 3. 技术栈

- 前端：React + Vite + React Router + Monaco + ECharts
- 后端：FastAPI + SQLModel + SQLite
- 队列：Redis + RQ
- 量子执行：Qibo
- 测试：pytest（后端），Vitest + Node fallback（前端）

## 4. 目录结构（当前）

```text
mvp_qcp/
├─ backend/
│  ├─ app/
│  │  ├─ api/            # auth, health, tasks 路由
│  │  ├─ core/           # 配置、日志
│  │  ├─ db/             # engine/session
│  │  ├─ models/         # User, Task
│  │  ├─ schemas/        # 请求/响应模型
│  │  ├─ services/       # 鉴权、sandbox、qibo 执行器
│  │  └─ worker/         # rq worker、任务执行
│  ├─ tests/
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ api/            # 前端 API 客户端
│  │  ├─ auth/           # token 管理
│  │  ├─ components/     # CodeEditor, ResultChart, ProtectedRoute
│  │  ├─ pages/          # Login/Register/Tasks
│  │  └─ tests/          # Vitest 测试
│  ├─ tests-node/        # 受限环境 fallback 测试
│  └─ package.json
├─ scripts/
│  ├─ start-dev.ps1
│  ├─ dev-health-check.ps1
│  ├─ run-backend-tests.ps1
│  └─ demo-checklist.md
└─ README.md
```

## 5. 运行方式（无 Docker）

### 5.1 后端环境

```powershell
cd "backend"
uv venv --python 3.11
uv pip install -r requirements.txt
```

### 5.2 启动 API

```powershell
cd "backend"
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5.3 启动 Worker

```powershell
cd "backend"
uv run python -m app.worker.rq_worker
```

### 5.4 启动前端

```powershell
cd "frontend"
npm install
npm run dev
```

### 5.5 一键启动

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/start-dev.ps1"
```

### 5.6 联调健康检查

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1"
```

## 6. API 结构说明

### 6.1 健康检查

- `GET /api/health`
- 作用：检查 API 存活状态

示例响应：

```json
{
  "status": "ok",
  "app": "QCP MVP API",
  "env": "dev"
}
```

### 6.2 鉴权接口

#### `POST /api/auth/register`

请求：

```json
{
  "username": "alice",
  "password": "pass123456"
}
```

响应：

```json
{
  "user_id": 1,
  "username": "alice"
}
```

#### `POST /api/auth/login`

请求：

```json
{
  "username": "alice",
  "password": "pass123456"
}
```

响应：

```json
{
  "access_token": "...",
  "token_type": "Bearer"
}
```

### 6.3 任务接口

所有任务接口都需要 Header：

`Authorization: Bearer <access_token>`

#### `POST /api/tasks/submit`

请求：

```json
{
  "code": "def main():\n    return {'counts': {'00': 10, '11': 6}}"
}
```

成功响应：

```json
{
  "task_id": 123,
  "status": "PENDING"
}
```

可能错误：

- `503`：任务入队失败（返回 `任务入队失败`）

#### `GET /api/tasks/{task_id}`

响应：

```json
{
  "task_id": 123,
  "status": "RUNNING",
  "error_message": null
}
```

说明：

- 非属主访问或任务不存在统一返回 `404 任务不存在`

#### `GET /api/tasks/{task_id}/result`

响应（未完成）：

```json
{
  "task_id": 123,
  "status": "RUNNING",
  "result": null,
  "message": "task not finished"
}
```

响应（成功）：

```json
{
  "task_id": 123,
  "status": "SUCCESS",
  "result": {
    "counts": {"00": 10, "11": 6},
    "probabilities": {"00": 0.625, "11": 0.375}
  },
  "message": null
}
```

## 7. 任务状态机

`PENDING -> RUNNING -> SUCCESS | FAILURE`

- `PENDING`：任务已创建，等待执行
- `RUNNING`：Worker 正在执行
- `SUCCESS`：执行成功并写入结果
- `FAILURE`：执行失败并写入错误信息

## 8. 测试说明

### 8.1 后端

```powershell
cd "backend"
uv run pytest -q
```

或：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/run-backend-tests.ps1"
```

覆盖重点：

1. 健康检查
2. 注册/登录
3. 任务提交契约
4. 入队成功与失败处理
5. 任务属主隔离

### 8.2 前端

Vitest（当前环境可运行但存在 tests-node 扫描冲突）：

```powershell
cd "frontend"
npm run test
```

受限环境兜底（推荐稳定执行）：

```powershell
cd "frontend"
npm run test:node
```

## 9. 已知问题

1. `npm run test` 目前会扫描 `tests-node/*.test.mjs`，导致 "No test suite found" 失败。建议后续在 Vitest 配置中明确 include/exclude。
2. Windows 环境下偶发 Git `index.lock` 残留，需要串行执行 Git 操作可避免。

## 10. 演示路径

详见：`scripts/demo-checklist.md`

建议演示流程：

1. 注册并登录
2. 进入 `tasks/circuit`，拖拽量子门并观察右侧 QASM 与下方概率图实时更新
3. 在右侧故意输入非法 QASM，确认仅报错且左侧电路保持上次有效状态
4. 进入 `tasks/code`，验证旧脚本提交流程仍可用

## 11. Docker 开发/演示运行

### 11.1 一键启动（推荐）

```powershell
docker compose up --build
```

启动后访问：

- 前端：`http://127.0.0.1:5173`
- 后端健康检查：`http://127.0.0.1:8000/api/health`

### 11.2 停止与清理

```powershell
docker compose down
```

如果需要同时删除命名卷（会清空 SQLite 持久化数据）：

```powershell
docker compose down -v
```

### 11.3 联调健康检查（Docker 模式）

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker
```

深度验证（含注册/登录/任务提交流程）：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker -Deep
```

### 11.4 与本机模式差异

- 本机模式：使用 `scripts/start-dev.ps1` 分别启动本机进程。
- Docker 模式：使用 `docker compose up --build` 启动容器化运行链路。
- 两种模式可并存，建议单次联调只启用一种，避免端口冲突。

### 11.5 容器隔离执行（方案 B）

- 任务执行默认使用 `EXECUTION_BACKEND=docker`，由 `worker` 创建短生命周期执行容器。
- `worker` 通过挂载 `/var/run/docker.sock` 访问 Docker Daemon。
- 执行镜像默认 `EXECUTION_IMAGE=qcp-backend-dev:latest`，入口 `EXECUTION_RUNNER_MODULE=app.services.execution.runner`。
- 默认执行限制：禁网、只读根文件系统、内存/CPU/PIDs 限制、超时强制回收。
- 若出现 `DOCKER_UNAVAILABLE` 或 `EXEC_IMAGE_NOT_FOUND`，先确认 Docker Desktop 正常、镜像已构建、socket 挂载生效。
- `EXECUTION_BACKEND=local` 仅用于测试场景显式启用，不建议作为开发/演示默认配置。


## Reliability and Observability Update (2026-03-10)

- Runtime knobs: `RQ_JOB_TIMEOUT_SECONDS`, `QIBO_EXEC_TIMEOUT_SECONDS`, `TASK_MAX_RETRIES`, `TASK_RETRY_BACKOFF_SECONDS`, `QUEUE_MAX_DEPTH`, `IDEMPOTENCY_TTL_HOURS`, `IDEMPOTENCY_CLEANUP_BATCH_SIZE`.
- Invariant: `RQ_JOB_TIMEOUT_SECONDS` must be greater than `QIBO_EXEC_TIMEOUT_SECONDS`.
- `POST /api/tasks/submit` accepts optional `Idempotency-Key` header and response now includes `deduplicated`.
- Added endpoints: `GET /api/health/live`, `GET /api/health/ready`, `GET /api/metrics`.

## Workbench UX Iteration (2026-03-13)

图形化工作台已完成一轮可用性增强，重点面向“新用户上手 + 高频编辑”场景：

- 双比特门两步放置提供明确引导和中文可执行提示。
- 工作台新增 `撤销 / 重做 / 清空线路 / 重置工作台` 操作。
- 结果区新增显示模式切换：`仅显示过滤后状态` 与 `显示全部状态`。
- 结果区显示过滤规则与阈值：`epsilon = 2^-(n+2)`，并展示可见/隐藏统计。
- 新增内置模板（Bell 态、均匀叠加态），支持一键加载。
- 首次进入展示快速引导，用户关闭后会记住偏好。
- 本地草稿自动保存与恢复（线路、QASM、显示模式）。
- QASM 错误面板统一中文文案，并附修复建议。

### Workbench 操作建议

1. 访问 `http://127.0.0.1:5173/tasks/circuit`。
2. 先点击模板按钮（如 Bell 态）验证闭环结果。
3. 在左侧拖拽量子门编辑线路，或在右侧修改 QASM。
4. 使用工具栏撤销/重做快速试错。
5. 在结果区切换显示模式，对比过滤后与全量概率分布。
