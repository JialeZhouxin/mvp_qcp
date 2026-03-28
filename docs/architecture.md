# 当前架构说明

## 摘要

QCP MVP 当前已经形成一条完整的内部研发/演示闭环：

- 前端提供图形化工作台、代码任务页、任务中心
- 后端负责鉴权、项目管理、任务入队、状态查询
- Redis + Celery 承担异步任务执行
- PostgreSQL 作为业务真相源
- 代码任务与图形电路任务使用两条不同的执行路径

本文件只描述**当前仓库真实实现**，不描述未来目标态。

## 物理拓扑

当前默认 Docker Compose 拓扑如下：

```text
frontend(5173)
  -> backend(8000)
       -> postgres(5432)
       -> redis(6379)
       -> worker(qcp-default)
            -> execution-service(8010)
                 -> Docker runner
       -> circuit-worker(qcp-circuit)
            -> qibo hot executor
```

服务说明：

- `frontend`
  - React + Vite 开发服务器
  - 通过 `VITE_API_BASE_URL` 访问后端
- `backend`
  - FastAPI 主 API
  - 负责登录、任务提交、任务状态、项目保存/读取
- `postgres`
  - 业务数据库
  - 用户、租户、任务、项目、幂等记录都在这里
- `redis`
  - Celery broker / backend
- `worker`
  - 处理代码任务队列 `qcp-default`
- `circuit-worker`
  - 处理图形电路任务队列 `qcp-circuit`
  - 维护常驻热进程，启动时预热 `qibo`
- `execution-service`
  - 代码任务执行服务
  - 默认走 Docker 隔离执行

## 核心业务入口

前端当前有三个主要任务入口：

- `/tasks/circuit`
  - 图形化量子电路工作台
  - 支持门库拖拽、电路画布、OpenQASM 编辑、本地模拟、时间步预览、项目保存
- `/tasks/code`
  - 代码任务提交页
  - 直接提交 Python 量子脚本
- `/tasks/center`
  - 任务中心
  - 查看任务历史、筛选、详情与结果

## 逻辑执行链路

### 1. 认证与租户

- 用户通过 `POST /api/auth/register` 注册
- 注册时自动创建并绑定独立租户
- 登录通过 `POST /api/auth/login`
- 后续接口使用 `Authorization: Bearer <token>`

当前多租户已经落到数据模型层，但产品形态仍偏“单用户单租户”。

### 2. 代码任务

代码任务链路为：

```text
frontend/code page
  -> POST /api/tasks/submit
  -> backend 写入 task
  -> Celery worker 消费 qcp-default
  -> execution-service
  -> Docker runner 执行用户代码
  -> 结果回写 PostgreSQL
  -> 前端轮询或查看任务中心
```

特点：

- 这条链路优先安全隔离
- 单任务固定开销较高
- 适合任意 Python 代码提交

### 3. 图形电路任务

图形电路链路为：

```text
frontend/circuit workbench
  -> POST /api/tasks/circuit/submit
  -> backend 写入 circuit task
  -> Celery circuit-worker 消费 qcp-circuit
  -> 常驻 qibo 热进程执行
  -> 结果回写 PostgreSQL
  -> 前端查看任务状态或任务中心
```

特点：

- 后端接收结构化电路 payload，而不是前端生成的 Python 脚本
- `circuit-worker` 启动时会预热 qibo
- 这条链路用于消除图形电路提交时的高冷启动延迟

### 4. 工作台本地模拟

图形化工作台的下方面板还存在一条浏览器本地模拟链路：

- 电路修改后，由前端 Web Worker 本地模拟
- 产生概率直方图和 Bloch 球数据
- 这条链路只用于**前端即时预览**
- 它不是后端真实任务执行结果

## 数据边界

当前数据库核心实体包括：

- `tenant`
- `user`
- `task`
- `project`
- `idempotencyrecord`

约束事实：

- 业务查询已经按 `tenant_id + user_id` 双边界收口
- Alembic 是当前 schema 演进方式
- 运行时不再通过 `create_all()` 自动建表

## 已知限制

以下限制是当前事实，不应被文档包装成已解决：

- 当前 `docker-compose.yml` 仍是开发/演示型编排，不是生产 hardened 栈
- Redis 仍是单点
- `execution-service` 的内部鉴权、Redis 韧性、任务僵尸回收等 P0/P1 风险尚未全部消化
- 图形电路本地模拟与后端执行链路存在“两套结果来源”，理解时需要区分

## 哪些文档不要再当现状参考

以下内容已经不适合作为当前事实参考：

- 把当前任务系统写成 `RQ`
- 把当前主数据库写成默认 `SQLite`
- 把图形电路任务仍写成前端生成脚本后统一走代码执行链路
- 把 `execution-service` 的健康状态写成固定 `remote`
