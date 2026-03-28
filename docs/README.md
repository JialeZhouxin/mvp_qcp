# 文档索引

本目录只保留少量**当前事实文档**作为唯一事实源，其余日期型文档视为历史记录。

## 当前事实文档

### 1. 架构说明

- [architecture.md](architecture.md)

说明当前系统的物理拓扑、逻辑链路、执行边界、已知限制和 MVP 现实状态。

### 2. 使用说明

- [usage-guide.md](usage-guide.md)

面向内部研发团队，覆盖登录、图形化工作台、代码任务、任务中心、项目保存与常见操作路径。

### 3. Docker 部署与运维

- [docker-deployment.md](docker-deployment.md)

只覆盖当前仓库真实存在的 `docker-compose.yml` 单机 Compose 栈，包括启动、验证、排障与已知陷阱。

### 4. 数据流

- [data-flow.md](data-flow.md)

描述认证、代码任务、图形电路任务、项目保存和任务中心的当前数据流。

### 5. 执行服务内部契约

- [execution-service-contract.md](execution-service-contract.md)

说明代码任务执行服务的当前内部 HTTP 契约与边界。

## 历史记录

以下文档保留为历史记录，不作为当前实现的事实来源：

- [architecture-review-2026-03-24.md](architecture-review-2026-03-24.md)
- [backend-database-migration-2026-03-25.md](backend-database-migration-2026-03-25.md)
- [p0-risk-register-2026-03-25.md](p0-risk-register-2026-03-25.md)
- [work-summary-2026-03-10.md](work-summary-2026-03-10.md)
- [plans/](plans/)

## 已退役入口

以下旧文档不再维护为活跃入口，只保留跳转说明：

- `project-status-and-usage.md`
- `project-usage-guide.md`
- `使用教程.md`

如果你要了解当前仓库怎么运行、怎么排障、当前架构到底是什么，请只看本索引列出的四份核心文档。
