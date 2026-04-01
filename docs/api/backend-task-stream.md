# 后端异步事件契约（SSE）

## 1. 端点定义

- 方法：`GET`
- 路径：`/api/tasks/stream`
- 鉴权：需要 Bearer Token
- 响应类型：`text/event-stream`
- 实现位置：
  - 路由：`backend/app/api/tasks_center.py`
  - 流实现：`backend/app/api/task_center_streaming.py`
  - 服务：`backend/app/services/task_event_stream_service.py`

## 2. 查询参数

- `task_ids`：可选，逗号分隔整数列表，例如 `1,2,3`
- 解析规则：
  - `null` / 空串 / 全空白 -> 视为不限制
  - 任一片段非数字 -> `400`，`detail` 含 `invalid task id`

## 3. 事件类型（消费者契约层）

后端在 OpenAPI 中通过 `x-sse-events` 固化事件名与模型映射：

- `task_status` -> `TaskStatusStreamEvent`
- `heartbeat` -> `TaskHeartbeatEvent`

### `task_status` 结构

```json
{
  "task_id": 123,
  "status": "RUNNING",
  "updated_at": "2026-03-31T08:00:00.000000",
  "duration_ms": 1500,
  "attempt_count": 1
}
```

### `heartbeat` 结构

```json
{
  "timestamp": "2026-03-31T08:00:10.000000"
}
```

## 4. 推送与节流语义

- 轮询间隔：`1s`（`poll_interval_seconds`）
- 心跳周期：`10s`（`heartbeat_seconds`）
- 数据集上限：最近 `200` 条任务（`MAX_STREAM_TASKS`）
- 变更检测版本键：`status|updated_at|attempt_count|duration_ms`
  - 版本变化才发送 `task_status`

## 5. 连接生命周期

- 客户端断开（`request.is_disconnected()`）即停止推送。
- 服务端响应头：
  - `Cache-Control: no-cache`
  - `X-Accel-Buffering: no`

## 6. 消费端建议

- 事件驱动更新主状态（列表/详情）。
- 心跳只用于保活与链路监测，不驱动业务状态。
- 流断开后应降级轮询（项目前端已实现该策略）。
