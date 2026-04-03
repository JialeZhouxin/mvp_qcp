# 文档索引

`docs/` 目录只保留两类内容：

- 当前事实文档：描述仓库当前真实实现、真实运行方式和真实限制
- 历史设计文档：保留设计过程、方案权衡和阶段性记录，不作为当前实现事实源

如果你只想快速判断“系统现在是什么、怎么跑、出问题先看哪里”，按下面顺序阅读即可。

## 推荐阅读顺序

1. [architecture.md](architecture.md)
   当前系统边界、服务拓扑、两条执行链路、前后端职责划分。
2. [usage-guide.md](usage-guide.md)
   面向开发和演示的日常使用入口，包括图形化编程、代码任务、任务中心和项目保存。
3. [docker-deployment.md](docker-deployment.md)
   本地 Docker Compose 启动、验证、排障和服务重启规则。
4. [china-deployment-playbook.md](china-deployment-playbook.md)
   中国网络环境与上线导向的镜像源、依赖供应链和合规基线。
5. [data-flow.md](data-flow.md)
   认证、任务提交、任务执行、结果展示和项目保存的数据流。
6. [api/README.md](api/README.md)
   面向内部开发的 API 文档索引，覆盖后端 HTTP、SSE 事件消费者契约、前端 API 层与对外 Hook 契约。
7. [execution-service-contract.md](execution-service-contract.md)
   仅面向内部服务通信，描述代码任务执行服务的 HTTP 契约。

## 当前重点事实

- 当前任务系统分成两条执行链路：
  - 代码任务：`worker -> execution-service -> Docker runner`
  - 图形化量子电路任务：`circuit-worker -> qibo hot executor`
- 图形化工作台同时存在两类结果来源：
  - 浏览器本地模拟，用于即时预览概率分布和 Bloch 球
  - 后端真实任务执行结果，用于提交后的正式结果
- 图形化工作台已支持基础门、受控门、参数门，以及新增的高级门：
  - `SX`、`√Y`
  - `CY`、`CH`、`CSWAP`、`CCZ`
  - `RXX`、`RYY`、`RZZ`、`RZX`
- `backend` 和 `execution-service` 在开发态使用 `uvicorn --reload`，会热更新代码。
- `worker` 和 `circuit-worker` 是 Celery worker，不会自动热重载；后端执行逻辑变更后，必须重启对应 worker 才会加载新代码。

## 目录说明

### 当前事实文档

- [architecture.md](architecture.md)
- [usage-guide.md](usage-guide.md)
- [docker-deployment.md](docker-deployment.md)
- [china-deployment-playbook.md](china-deployment-playbook.md)
- [data-flow.md](data-flow.md)
- [api/README.md](api/README.md)
- [execution-service-contract.md](execution-service-contract.md)

### 历史记录与风险记录

- [architecture-review-2026-03-24.md](architecture-review-2026-03-24.md)
- [backend-database-migration-2026-03-25.md](backend-database-migration-2026-03-25.md)
- [p0-risk-register-2026-03-25.md](p0-risk-register-2026-03-25.md)
- [work-summary-2026-03-10.md](work-summary-2026-03-10.md)

### 方案与实施计划

- [plans/README.md](plans/README.md)

## 已退役入口

以下文件只保留跳转意义，不应再作为“当前状态说明”引用：

- `project-status-and-usage.md`
- `project-usage-guide.md`
- `使用教程.md`

## 文档使用约定

- 判断“现在系统怎么工作”，只看“当前事实文档”。
- 判断“为什么这样设计过”，再看 `plans/` 和带日期的历史文档。
- 如果文档内容和代码实现冲突，以代码实现为准，并优先修正本文档入口指向的事实文档。
