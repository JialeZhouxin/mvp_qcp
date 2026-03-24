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

## 2.4 后端低风险优化清单（2026-03-24）

> 目标：仅做最小改动、低风险优先，不改变现有 API 契约。

1. **P0：SSE 订阅参数规模限制**
   - 位置：`backend/app/use_cases/task_center_use_cases.py`、`backend/app/api/tasks_center.py`
   - 现状：`task_ids` 缺少长度与数量上限，存在资源放大风险。
   - 建议：为 `task_ids` 增加输入长度限制，并限制可订阅任务 ID 数量上限。

2. **P1：DockerExecutor 构造参数收敛**
   - 位置：`backend/app/services/execution/docker_executor.py`
   - 现状：构造函数参数较多，可维护性一般。
   - 建议：将资源/隔离相关参数收敛为配置对象，减少构造函数入参数量。

3. **P1：容器日志读取路径收敛**
   - 位置：`backend/app/services/execution/docker_executor.py`
   - 现状：stdout/stderr 分两次读取，复杂度和可维护性可优化。
   - 建议：在不改变错误语义前提下统一日志读取流程。

4. **P2：健康检查与指标依赖注入化**
   - 位置：`backend/app/api/health.py`、`backend/app/api/metrics.py`
   - 现状：使用模块级服务单例，不利于测试替换和扩展。
   - 建议：改为依赖函数注入（`Depends`），保持接口行为不变。

5. **P2：TaskCenter 用例层方法说明补齐**
   - 位置：`backend/app/use_cases/task_center_use_cases.py`
   - 现状：类型已较完整，方法级 Docstring 仍可补齐。
   - 建议：为公开入口方法补充简洁 Docstring，满足企业规范。

## 2.5 架构优先级生产化改造清单（P0/P1/P2）（2026-03-24）

> 目标：在不打断 MVP 业务迭代的前提下，确保未来可平滑转向生产部署。

### P0（上线前必须完成）

1. **生产运行形态与开发形态彻底分离**
   - 范围：`docker-compose.yml`（生产编排单独维护）
   - 要点：生产禁用 `--reload`、禁用源码挂载、`ENV` 使用生产值、镜像固定版本。

2. **数据库生产化（SQLite -> PostgreSQL）**
   - 范围：`backend/app/core/config.py`、`backend/app/db/session.py`
   - 要点：生产不使用 SQLite 默认值；建立迁移链路（Alembic）；备份与恢复策略可演练。

3. **执行沙箱边界加固**
   - 范围：`backend/app/services/execution/docker_executor.py`、部署编排
   - 要点：限制执行容器权限与资源；隔离执行平面；避免高风险宿主能力暴露。

4. **SSE/任务接口防资源放大**
   - 范围：`backend/app/api/tasks_center.py`、`backend/app/use_cases/task_center_use_cases.py`
   - 要点：限制 `task_ids` 长度与数量；补充关键接口限流与连接保护。

5. **密钥与配置治理**
   - 范围：`backend/app/core/config.py`
   - 要点：生产配置全部显式注入；敏感配置放入 Secret Manager；保留 fail-fast。

### P1（上线后短期完成）

1. **健康检查与指标依赖注入化**
   - 范围：`backend/app/api/health.py`、`backend/app/api/metrics.py`、`backend/app/services/readiness_service.py`
   - 要点：去模块级单例，提升可测试性与可替换性。

2. **队列可靠性增强（RQ 体系内）**
   - 范围：`backend/app/worker/rq_worker.py`、任务提交/重试相关服务
   - 要点：重试退避、积压告警、失败回收、扩缩容阈值。

3. **可观测性基线补齐**
   - 范围：核心 API/Service 链路
   - 要点：结构化日志字段统一（`request_id/task_id/user_id`）；指标覆盖延迟、失败率、超时率、队列深度。

4. **执行模块可维护性收敛**
   - 范围：`backend/app/services/execution/docker_executor.py`
   - 要点：构造参数收敛、日志读取路径收敛，保持错误语义不变。

### P2（中长期演进）

1. **控制平面 / 执行平面解耦**（独立扩缩容）
2. **多租户与配额体系**（并发/资源/提交频率）
3. **高可用与灾备体系**（DB/Redis/跨可用区）
4. **审计与合规闭环**（审计日志、数据分级与保留策略）

## 2.6 路线评估：继续开发还是转向生产

### 当前状态判断

- 当前更接近 **MVP 开发/演示阶段**，尚不建议直接转生产。
- 主要依据：
  - 运行与编排仍以开发体验优先（开发模式与联调配置仍占主导）。
  - 默认数据与部署策略仍偏本地/演示形态。
  - 沙箱隔离、SSE 资源防护、可观测性仍有明确补强项（见 P0/P1）。

### 建议路线（推荐）

**建议继续开发，但采用“生产护栏开发”策略，而不是立刻转生产。**

即：
1. 功能迭代继续推进（避免过早生产化导致交付停滞）；
2. 所有新增功能同时满足关键护栏（配置隔离、接口限流、执行隔离、可观测性）；
3. 以 P0 作为“生产准入门槛”，P1 作为“稳定运营门槛”。

### 为什么这样更稳

- 你担心“继续开发会跑偏”是合理的；
- 但如果现在强行转生产，风险是功能和架构都会半成品；
- “开发优先 + 生产护栏”可以同时控制两类风险：
  - 不耽误功能闭环；
  - 不积累未来难以清理的生产债务。

## 2.7 关键生产护栏门禁清单（可执行版）（2026-03-24）

> 使用方式：作为 PR 合并门禁 + Release 发布门禁。`BLOCKER` 不通过禁止发布。

### 2.7.1 门禁项总表

| ID | 护栏 | 负责人 | 检查动作 | 通过标准 | 级别 |
|---|---|---|---|---|---|
| CFG-01 | 配置隔离 | Backend | 在 `ENV=prod` 下仅注入默认配置启动 | 启动失败，明确提示生产配置缺失/默认值非法 | BLOCKER |
| CFG-02 | 配置隔离 | Backend/DevOps | 在 `ENV=prod` 下用完整生产配置启动 | 启动成功，`/api/health/live` 返回正常 | BLOCKER |
| CFG-03 | 密钥治理 | DevOps | 审核部署配置与仓库 | JWT/DB/Redis 凭据全部来自 Secret，仓库无明文凭据 | BLOCKER |
| RL-01 | 限流保护 | Backend | 对登录/提交/SSE 做超阈值请求验证 | 超限返回受控错误（429/4xx），服务稳定 | BLOCKER |
| RL-02 | SSE 参数上限 | Backend | 构造超长/超量 `task_ids` 请求 | 返回明确 4xx，服务资源无异常放大 | BLOCKER |
| ISO-01 | 执行隔离 | Backend/DevOps | 审核执行容器运行参数 | 只读根FS、禁网、CPU/Mem/PIDs/timeout 全开启 | BLOCKER |
| ISO-02 | 执行后端策略 | Backend | `ENV=prod` + `execution_backend=local` 启动 | 启动被 fail-fast 拒绝 | BLOCKER |
| ISO-03 | 宿主能力暴露 | DevOps | 审核生产编排权限与挂载 | 生产不暴露高危宿主能力（如 `docker.sock`） | BLOCKER |
| OBS-01 | 结构化日志 | Backend | 触发一次任务提交与失败链路 | 日志含 `request_id/task_id/user_id/error_code` | BLOCKER |
| OBS-02 | 指标完整性 | Backend/SRE | 访问 `/api/metrics` 并触发任务流量 | 至少覆盖请求量、错误率、延迟、队列深度、任务终态 | BLOCKER |
| OBS-03 | 健康检查有效性 | Backend/SRE | 分别验证 live/ready，并模拟依赖异常 | live 正常，ready 失败可定位具体依赖 | BLOCKER |

### 2.7.2 PR 合并门禁（开发阶段）

后端变更至少执行：

```bash
cd backend
pytest -q tests/test_mvp_smoke.py tests/test_task_submit_service.py tests/test_task_center_api.py
```

若涉及接口契约或分层边界，再执行：

```bash
pytest -q tests/test_openapi_contracts.py tests/test_architecture_boundaries.py
```

跨端改动补充：

```bash
cd frontend
npm run test
npm run build
```

### 2.7.3 Release 发布门禁（上线前）

发布前必须满足：

1. `2.7.1` 全部 `BLOCKER` 通过。
2. 生产配置与密钥来源完成 Backend + DevOps 双签。
3. 告警联通（错误率、队列积压、执行超时）。
4. 回滚路径可执行（应用版本 + 数据库变更）。

### 2.7.4 当前推荐执行策略

- 继续功能开发，但按门禁开发。
- 每个迭代先过 PR 门禁，再进入集成。
- 到发布节点统一执行 Release 门禁。

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

## Graphical Workbench Update (2026-03-12)

### New frontend entries

- `/tasks/circuit`: graphical quantum workbench (drag gates + editable OpenQASM 3 + browser-local simulation).
- `/tasks/code`: legacy code submission page retained for compatibility.

### Workbench runtime limits

- `qubits <= 10`
- `depth <= 200`
- `total_gates <= 1000`

### Histogram filtering rule

- Display only states with `p > 2^-(n+2)`.
- Show total/visible/hidden state counts and probability sum for explainability.

## Workbench UX Iteration (2026-03-13)

### New capabilities

- Two-qubit gate placement now has step guidance and actionable Chinese error hints.
- Added toolbar operations: `撤销` / `重做` / `清空线路` / `重置工作台`.
- Added result display mode toggle: filtered-only vs all states.
- Added epsilon visibility (`2^-(n+2)`) and display statistics in result panel.
- Added built-in templates (Bell / superposition) for quick demo startup.
- Added first-time quick guide with persisted dismiss preference.
- Added local draft persistence and restore for circuit/QASM/display mode.
- Localized QASM parse feedback with structured fix suggestions.

### Updated usage flow

1. Open `/tasks/circuit` and load a template first for baseline verification.
2. Modify the circuit via drag-drop or edit QASM directly.
3. Use undo/redo while iterating to compare nearby circuit variants.
4. Switch display mode to inspect filtered and full probability distributions.
5. Refresh the page to verify draft auto-restore behavior.
6. Click `Submit Task` to send the current circuit as a backend task (with idempotency key).
7. Check `task_id` and `task status` in-place, and use `Refresh Status` to fetch latest progress.
8. If the UI shows deduplicated hint, repeated submit was bound to an existing task.
9. Jump to `/tasks/center` for full task timeline and diagnostics.
