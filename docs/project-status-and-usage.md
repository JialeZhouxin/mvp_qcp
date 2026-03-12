# QCP MVP 项目进度与使用指南（当前版）

## 1. 项目简介

Quantum Cloud Platform（QCP）是一个面向量子任务提交与结果可视化的 MVP 项目。当前实现了从用户认证到任务执行与前端展示的最小业务闭环：

1. 用户注册/登录，获取访问令牌
2. 前端提交 Python 量子脚本
3. 后端将任务异步入队（Redis + RQ）
4. Worker 执行脚本并回写结果
5. 前端轮询状态并展示结果（JSON + 概率分布图）

## 2. 当前项目进度

## 2.1 已完成

- 前端：登录/注册/任务页、Monaco 编辑器、ECharts 结果图、轮询与刷新
- 后端：FastAPI API、SQLite + SQLModel、认证、任务提交/状态/结果接口
- 异步执行：Redis 队列 + RQ Worker
- 执行引擎：Qibo 受限执行（含 AST 校验和超时控制）
- 测试：后端 smoke/integration、前端 Vitest + `test:node` 兜底
- 运行模式：本机模式 + Docker 开发/演示模式

## 2.2 容器化迁移状态

- 已完成 `spec-workflow` 全流程（Requirements/Design/Tasks/Implementation）
- `dockerized-dev-demo-runtime` 规格已完成，8/8 任务完成
- 已新增并验证：
  - `docker-compose.yml`
  - `backend/Dockerfile`, `frontend/Dockerfile`
  - `backend/.dockerignore`, `frontend/.dockerignore`
  - Docker 模式健康检查（`scripts/dev-health-check.ps1 -Docker`）
- 已验证 SQLite 持久化卷：容器重启后数据保留

## 2.3 仍待完善（MVP 后续）

- 生产级沙箱与资源隔离强化（CPU/内存粒度）
- 前端 UI 与交互细节优化
- 前端测试扫描规则进一步清理（tests-node 与 Vitest 边界）

## 3. 技术栈与架构

- 前端：React + Vite + React Router + Monaco + ECharts
- 后端：FastAPI + SQLModel + SQLite
- 队列：Redis + RQ
- 执行：Qibo
- 测试：pytest / Vitest

核心运行链路：

`Browser -> Frontend(5173) -> Backend(8000) -> Redis -> Worker -> SQLite -> Frontend`

## 4. 如何使用本项目（重点）

推荐优先使用 Docker 模式，统一环境、启动简单、联调稳定。

## 4.1 Docker 模式（推荐）

前置条件：

- 已安装 Docker Desktop
- 已启动 Docker Engine

启动：

```powershell
cd "E:/02_Projects/quantuncloudplatform/mvp_qcp"
docker compose up --build -d
```

访问：

- 前端：`http://127.0.0.1:5173`
- 后端健康检查：`http://127.0.0.1:8000/api/health`
- API 文档：`http://127.0.0.1:8000/docs`

健康检查：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker
```

深度检查（认证 + 提交任务 + 查询状态）：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker -Deep
```

停止：

```powershell
docker compose down
```

停止并删除卷（会清空 SQLite 数据）：

```powershell
docker compose down -v
```

## 4.2 本机模式（备选）

一键启动：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/start-dev.ps1"
```

本机健康检查：

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1"
```

## 5. 典型使用流程（业务视角）

1. 打开前端页面并注册账号
2. 登录后进入任务页
3. 在编辑器中提交量子脚本
4. 观察任务状态从 `PENDING/RUNNING` 到 `SUCCESS/FAILURE`
5. 查看返回结果与概率分布图

## 6. 关键接口速览

- `GET /api/health`：服务健康检查
- `POST /api/auth/register`：注册
- `POST /api/auth/login`：登录
- `POST /api/tasks/submit`：提交任务（需 Bearer Token）
- `GET /api/tasks/{task_id}`：查询状态（需 Bearer Token）
- `GET /api/tasks/{task_id}/result`：查询结果（需 Bearer Token）

## 7. 常见问题与排障

## 7.1 `/api/health` 浏览器“看起来没内容”

该接口返回的是 JSON，不是 HTML 页面。可直接在终端验证：

```powershell
Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/api/health"
```

## 7.2 Docker 命令权限报错

- 在当前环境中，部分 Docker 命令可能需要更高权限才能访问 `dockerDesktopLinuxEngine`
- 先执行 `docker version` 验证引擎状态，再执行 `docker compose ps` 排查服务状态

## 7.3 前端可打开但任务提交失败

优先检查：

1. `backend` 与 `worker` 是否都在运行（`docker compose ps`）
2. Redis 是否健康
3. 登录后是否携带 Bearer Token

## 8. 文档与代码入口

- 主说明：`README.md`
- 健康检查脚本：`scripts/dev-health-check.ps1`
- 一键启动脚本（本机模式）：`scripts/start-dev.ps1`
- Docker 编排：`docker-compose.yml`
- 后端入口：`backend/app/main.py`
- Worker 入口：`backend/app/worker/rq_worker.py`
- 前端入口：`frontend/src/main.tsx`
## Reliability and Observability Update (2026-03-10)

### New task terminal states

- `TIMEOUT`
- `RETRY_EXHAUSTED`

### New submit behavior

- `POST /api/tasks/submit` supports optional `Idempotency-Key` header.
- Submit response includes `deduplicated` field.
- Queue overload now returns `503` with code `QUEUE_OVERLOADED`.

### New health and metrics endpoints

- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/metrics`

### New environment keys

- `TASK_MAX_RETRIES`
- `TASK_RETRY_BACKOFF_SECONDS`
- `QUEUE_MAX_DEPTH`
- `IDEMPOTENCY_TTL_HOURS`
- `IDEMPOTENCY_CLEANUP_BATCH_SIZE`
