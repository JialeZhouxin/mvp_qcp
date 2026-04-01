# 契约维护与变更流程

## 1. 单一事实来源

- 后端契约来源：FastAPI OpenAPI（`backend/app/main.py`）
- 前端类型来源：`frontend/src/api/generated/contracts.ts`
- SSE 事件契约来源：
  - `/api/tasks/stream` 的 `x-sse-events`
  - `TaskStatusStreamEvent` / `TaskHeartbeatEvent` schema

## 2. 后端改动后的同步步骤

1. 修改后端路由/Schema。
2. 运行脚本生成前端类型：
   - `python scripts/generate_openapi_contracts.py`
3. 检查生成物差异：
   - `frontend/src/api/generated/contracts.ts`
4. 如有协议变更，同步更新本目录文档。

## 3. 自动校验（建议纳入 CI）

- `backend/tests/test_openapi_contracts.py`
  - 校验 SSE schema 与 `x-sse-events` 扩展存在且一致
- 前端相关测试（任务流、Hook、工作台）用于消费层回归

## 4. 变更准入规则

- 不允许仅改前端 `generated/contracts.ts` 而不改后端 schema。
- 新增 `task_status` 事件字段时：
  - 同步后端 schema
  - 同步前端 `TaskStatusStreamEvent` 消费逻辑
  - 同步任务中心列表事件合并逻辑
- 修改错误体结构时，需评估 `apiRequest` 与 `toErrorMessage` 的兼容性。

## 5. 常见漂移风险

- 风险 1：后端新增字段，前端未重生成类型 -> 类型滞后
- 风险 2：后端错误 `detail` 结构变化 -> 前端报错文案退化
- 风险 3：SSE 事件名变更 -> `task-stream.ts` 无法分派
- 风险 4：状态枚举新增 -> `frontend/src/lib/task-status.ts` 未同步
