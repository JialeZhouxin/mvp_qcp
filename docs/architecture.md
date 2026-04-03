# 当前架构说明

## 摘要

QCP MVP 当前已经形成一套可运行的开发与演示闭环：

- 前端提供图形化量子电路工作台、代码任务页、任务中心和项目保存
- 后端负责认证、项目管理、任务入队、状态查询和结果读写
- PostgreSQL 是业务真相源
- Redis + Celery 承担异步执行调度
- 代码任务、图形化量子电路任务、混合算法任务走不同执行链路

本文档只描述仓库当前真实实现，不描述目标态或规划态。

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
       -> hybrid-worker(qcp-hybrid)
            -> hybrid vqe executor
```

## 服务职责

### frontend

- React + Vite 开发服务
- 图形化量子电路编辑、QASM 编辑、本地模拟、结果可视化
- 代码任务提交、任务中心、项目管理

### backend

- FastAPI 主 API
- 用户认证、任务创建、任务查询、项目保存与读取
- 把不同类型任务路由到不同队列

### postgres

- 业务真相源
- 保存用户、租户、任务、项目、幂等等业务数据

### redis

- Celery broker / backend
- 图形化任务执行器的心跳协调用途

### worker

- 消费 `qcp-default`
- 负责代码任务
- 调用 `execution-service` 执行隔离代码

### circuit-worker

- 消费 `qcp-circuit`
- 负责图形化量子电路任务
- 维护常驻热执行器并预热 `qibo`

### hybrid-worker

- 消费 `qcp-hybrid`
- 负责混合算法任务（当前为 VQE）

### execution-service

- 只服务于代码任务执行
- 当前默认使用 Docker runner 进行隔离执行

## 任务入口

当前前端主要任务入口为：

- `/tasks/circuit`
  - 图形化量子编程工作台
  - 支持画布拖拽、QASM 编辑、本地模拟、时间步预览、项目保存与任务提交
- `/tasks/code`
  - Python 代码任务提交
- `/tasks/center`
  - 查看任务历史、详情、结果和状态

## 两条执行链路

### 代码任务链路

```text
frontend/code page
  -> POST /api/tasks/submit
  -> backend 写入 task
  -> Celery worker 消费 qcp-default
  -> execution-service
  -> Docker runner 执行用户代码
  -> 结果回写 PostgreSQL
  -> 前端轮询或在任务中心查看
```

特点：

- 以隔离执行为优先
- 固定开销比图形化任务更高
- 适合直接提交 Python 量子脚本

### 图形化量子电路任务链路

```text
frontend/circuit workbench
  -> POST /api/tasks/circuit/submit
  -> backend 写入 circuit task
  -> Celery circuit-worker 消费 qcp-circuit
  -> qibo hot executor 执行
  -> 结果回写 PostgreSQL
  -> 前端查看任务状态或任务中心结果
```

特点：

- 后端接收结构化电路 payload，而不是前端生成的 Python 脚本
- `circuit-worker` 启动时预热 `qibo`
- 目标是降低图形化电路提交时的冷启动成本

### 混合算法任务链路

```text
frontend/circuit workbench (hybrid mode)
  -> POST /api/tasks/hybrid/submit
  -> backend 写入 hybrid task
  -> Celery hybrid-worker 消费 qcp-hybrid
  -> VQE 迭代执行（含中间进度事件）
  -> 结果回写 PostgreSQL
  -> 前端查看任务状态和收敛轨迹
```

## 图形化工作台能力边界

图形化工作台当前包含三部分能力：

### 1. 画布编辑

- 门库拖拽
- 参数编辑
- 多比特门放置
- 项目保存与恢复

### 2. QASM 读写

- 支持画布和 QASM 之间同步转换
- 标准门可直接序列化/反序列化
- 部分高级门在导出时会分解成标准门序列

### 3. 浏览器本地模拟

- 用于即时预览，不等于后端正式任务结果
- 当前可展示：
  - 概率分布
  - Bloch 球结果
  - 时间步预览

## 当前图形化门集

当前工作台支持以下门类：

- 基础单比特门：
  - `I`、`X`、`Y`、`Z`、`H`、`S`、`SDG`、`T`、`TDG`
- 参数单比特门：
  - `RX`、`RY`、`RZ`、`U`、`P`
- 新增单比特门：
  - `SX`、`√Y`
- 受控与纠缠门：
  - `CX`、`CY`、`CZ`、`CH`、`CP`、`CCX`、`CCZ`、`CSWAP`、`SWAP`
- 多量子旋转门：
  - `RXX`、`RYY`、`RZZ`、`RZX`
- 测量门：
  - `M`

说明：

- UI 展示为 `√Y`，内部按 `SY` 语义处理
- `SX`、`CY`、`CH`、`CSWAP` 可直接进入标准 QASM 路径
- `√Y`、`CCZ`、`RXX`、`RYY`、`RZZ`、`RZX` 在导出 QASM 时会按等价门序列分解

## 数据边界

当前数据库核心实体包括：

- `tenant`
- `user`
- `task`
- `project`
- `idempotencyrecord`

当前事实：

- 业务查询已经按 `tenant_id + user_id` 收口
- Alembic 是唯一 schema 演进方式
- 运行时不再依赖 `create_all()` 自动建表

## 当前运行事实

- `backend` 与 `execution-service` 使用 `uvicorn --reload`
- `worker`、`circuit-worker` 与 `hybrid-worker` 是 Celery worker，不会自动热更新导入代码
- 只要后端执行逻辑、门映射或 payload 校验发生变化，就需要重启对应 worker
- 图形化门支持已经扩展到高级门，但如果 `circuit-worker` 未重启，仍可能继续运行旧代码并报 `unsupported gate`

## 已知限制

- 当前 `docker-compose.yml` 仍是开发/演示型编排，不是生产加固方案
- Redis 仍为单点
- `execution-service` 的内部鉴权、任务回收等风险仍有待继续加固
- 图形化工作台同时存在本地模拟结果和后端真实执行结果，阅读结果时必须区分来源

## 不应再作为现状事实引用的旧说法

以下说法在当前仓库中已经不成立：

- 使用 `RQ` 作为任务队列
- 图形化电路统一转成 Python 脚本后再走代码执行链路
- `execution-service` 健康状态固定等于 `remote`
