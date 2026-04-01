# API 文档索引（内部开发）

本文档面向项目内部开发，覆盖：

- 后端 FastAPI HTTP 契约
- 任务中心 SSE（消费者契约层）
- 前端 `src/api` 适配层契约
- 前端对外 Hook 契约（页面消费边界）
- 契约变更与同步流程

## 阅读顺序

1. [后端 HTTP 契约](./backend-http.md)
2. [后端异步事件契约（SSE）](./backend-task-stream.md)
3. [前端 API 适配层契约](./frontend-api-layer.md)
4. [前端 Hook 消费契约](./frontend-hook-contracts.md)
5. [契约维护与变更流程](./contract-maintenance.md)

## 全局约定

- 主 API 基路径：`/api`
- 鉴权方式：`Authorization: Bearer <token>`（除登录/注册/健康检查/指标外）
- 主体编码：`application/json`（SSE 与 metrics 例外）
- 时间字段：后端返回 ISO8601 字符串（前端生成类型中为 `string`）
- 多租户隔离：服务端按 `tenant_id + user_id` 强约束；越权场景统一返回 `404`

## 关键枚举

- `task_type`：`code` | `circuit`
- `status`：`PENDING` | `RUNNING` | `SUCCESS` | `FAILURE` | `TIMEOUT` | `RETRY_EXHAUSTED`
- 终态：`SUCCESS` | `FAILURE` | `TIMEOUT` | `RETRY_EXHAUSTED`

## 文档边界

- 本索引覆盖主 API 与前端消费契约。
- 执行服务内部 HTTP 契约保留在 [../execution-service-contract.md](../execution-service-contract.md)。
