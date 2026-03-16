# QCP MVP 项目使用指南（当前版）

## 1. 文档目标

本指南用于快速上手当前仓库 `mvp_qcp`，覆盖以下内容：

- 运行环境准备
- Docker 与本地两种启动方式
- 前端页面使用路径
- 核心 API 与联调方式
- 常见故障排查

适用时间：2026-03（与当前 `master` 分支实现一致）。

## 2. 项目概览

QCP MVP 是一个量子任务提交与执行平台，主流程为：

1. 用户注册/登录获取 Token。
2. 前端提交量子任务（图形化电路或代码模式）。
3. 后端写入任务并入队（Redis + RQ）。
4. Worker 在受限执行环境中运行任务（Qibo）。
5. 前端展示任务状态与结果（任务中心 + 可视化结果）。

## 3. 技术栈与端口

- 前端：React + Vite（默认 `5173`）
- 后端：FastAPI + SQLModel + SQLite（默认 `8000`）
- 队列：Redis + RQ（默认 `6379`）
- 执行：Qibo（Worker 侧执行）

默认访问地址：

- 前端：`http://127.0.0.1:5173`
- 后端健康检查：`http://127.0.0.1:8000/api/health`
- OpenAPI：`http://127.0.0.1:8000/docs`

## 4. 环境准备

## 4.1 必备依赖

- Docker Desktop（推荐，最快上手）
- Node.js + npm（本地前端运行）
- Python 3.11 + `uv`（本地后端运行）
- Redis（本地模式需要）

## 4.2 环境变量

1. 复制示例文件：

```powershell
Copy-Item ".env.example" ".env"
```

2. 默认值可直接运行；常用关键项如下：

- `RQ_JOB_TIMEOUT_SECONDS=90`
- `QIBO_EXEC_TIMEOUT_SECONDS=60`
- `EXECUTION_BACKEND=docker`
- `REDIS_URL=redis://127.0.0.1:6379/0`（本地模式）

## 5. 启动方式

## 5.1 方式 A：Docker（推荐）

1. 在项目根目录启动：

```powershell
cd "E:/02_Projects/quantuncloudplatform/mvp_qcp"
docker compose up --build -d
```

2. 运行健康检查：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker
```

3. 深度联调检查（可选）：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker -Deep
```

4. 停止服务：

```powershell
docker compose down
```

5. 清理卷（会删除容器卷中的数据）：

```powershell
docker compose down -v
```

## 5.2 方式 B：本地进程启动

1. 一键启动（会拉起后端 API、Worker、前端）：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/start-dev.ps1"
```

2. 启动后检查：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1"
```

3. 若依赖未安装，可使用：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/start-dev.ps1" -InstallDeps
```

## 6. 前端使用路径

登录后默认进入图形化工作台：

- `/tasks/circuit`：图形化电路 + OpenQASM 3 编辑 + 本地模拟 + 提交任务
- `/tasks/code`：代码提交模式（兼容入口）
- `/tasks/center`：任务中心（列表、详情、SSE 实时状态流）

认证页面：

- `/login`
- `/register`

## 7. 核心 API（当前）

## 7.1 健康与监控

- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/metrics`

## 7.2 认证

- `POST /api/auth/register`
- `POST /api/auth/login`

## 7.3 任务

- `POST /api/tasks/submit`
- `GET /api/tasks/{task_id}`
- `GET /api/tasks/{task_id}/result`
- `GET /api/tasks`（任务中心列表，支持 `status/limit/offset`）
- `GET /api/tasks/{task_id}/detail`
- `GET /api/tasks/stream`（SSE）

说明：

- 任务相关接口需要 `Authorization: Bearer <access_token>`。
- `POST /api/tasks/submit` 支持 `Idempotency-Key` 请求头去重。
- 任务终态包含：`SUCCESS`、`FAILURE`、`TIMEOUT`、`RETRY_EXHAUSTED`。

## 7.4 项目持久化

- `PUT /api/projects/{name}`（保存/更新）
- `GET /api/projects`（分页列表）
- `GET /api/projects/{project_id}`（详情）

## 8. 常用验证命令

后端 smoke 测试：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/run-backend-tests.ps1"
```

前端测试：

```powershell
cd "frontend"
npm test
```

前端 Node fallback 测试：

```powershell
cd "frontend"
npm run test:node
```

## 9. 常见问题排查

1. `api/health` 不通：
- 先确认 `backend` 与 `worker` 是否正常启动。
- Docker 模式执行 `docker compose ps` 查看容器状态。

2. 提交任务失败（503）：
- 可能是队列拥塞（`QUEUE_OVERLOADED`）或入队失败（`QUEUE_PUBLISH_ERROR`）。
- 优先检查 Redis 连通性和 Worker 日志。

3. PowerShell 执行脚本受限：
- 使用文档中的 `-ExecutionPolicy Bypass` 启动脚本。

4. 前端可打开但任务状态不更新：
- 检查登录态是否有效（Bearer Token）。
- 检查 `/api/tasks/stream` 是否可达（任务中心依赖 SSE）。

## 10. 关键文件索引

- `README.md`
- `docker-compose.yml`
- `scripts/start-dev.ps1`
- `scripts/dev-health-check.ps1`
- `scripts/run-backend-tests.ps1`
- `backend/app/main.py`
- `frontend/src/App.tsx`

## 11. Workbench P0 更新（2026-03）

`/tasks/circuit` 的交互顺序已调整为：

1. 编辑区（拖拽电路 + QASM）
2. 本地模拟结果区（紧邻编辑区下方）
3. 提交区（紧邻结果区下方）
4. 项目区

新增控件：

- `+Qubit` / `-Qubit`：用于调整电路量子比特数量。

规则说明：

- 当量子比特数量 `<= 10` 时，页面支持浏览器本地实时模拟与直方图展示。
- 当量子比特数量 `> 10` 时，页面会显示“已关闭实时模拟，但仍可提交后端执行”的提示。
- `> 10` 不会阻塞任务提交；提交行为与普通任务一致。

## 12. Task 导航与信息架构 P0 更新（2026-03）

- `/tasks` 默认入口已调整为 `/tasks/center`，先进入任务中心再分流到具体执行模块。
- 任务域新增全局顶部导航，统一显示四个模块：`任务中心`、`图形化编程`、`代码提交`、`帮助文档`。
- 任务域新增全局面包屑，当前统一显示为：`任务 / 当前模块`。
- 新增帮助页面：`/tasks/help`，用于说明任务流转路径与文档索引。
- 任务中心页头新增“帮助文档”入口，便于用户从任务诊断直接进入说明页。
